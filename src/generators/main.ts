import { IndentationText, Node, Project, QuoteKind, SourceFile, ts, TypeLiteralNode, TypeNode, type PropertySignatureStructure, } from 'ts-morph'
import { allLocales } from '@faker-js/faker';
import { join } from 'node:path';

export type Options = {
  locale?: keyof typeof allLocales,
  inputDir?: string,
  outDir?: string
  isDryRun?: boolean
}

// TODO: make this more composable with extra options like locale, etc
export function scaffoldProject(options?: Options) {
  const configuration: Required<Options> = {
    locale: 'en',
    outDir: '',
    inputDir: '.',
    isDryRun: false,
    ...options,
  }
  // TODO: find which settings will need to be exposed
  const project = new Project({
    useInMemoryFileSystem: configuration.isDryRun ? true : false,
    compilerOptions: {
      target: ts.ScriptTarget.ES2023,
      rootDir: configuration.inputDir,
    },
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
      quoteKind: QuoteKind.Single,
    },
  });

  if (configuration.inputDir !== '.') {
    project.addSourceFilesAtPaths(configuration.inputDir);
  }

  async function createFactoryFunction(inputFile: SourceFile): Promise<SourceFile | null> {
    const aliases = inputFile.getTypeAliases();
    if (!aliases.length) {
      return null
    }
    const firstAlias = aliases[0];
    const typeNode = firstAlias?.getTypeNode()
    if (!Node.isTypeLiteral(typeNode)) {
      return null;
    }
    const name = firstAlias!.getName();

    const members = typeNode.getMembers();
    if (!members.length) {
      return null;
    }

    const resultFactoryFunctionFile = project.createSourceFile(join(configuration.outDir, `create${name}.ts`));
    resultFactoryFunctionFile.addImportDeclaration({
      namedImports: [{
        name: `faker${configuration?.locale.toUpperCase()}`,
        alias: 'faker'
      }],
      moduleSpecifier: '@faker-js/faker',
    });

    resultFactoryFunctionFile.addImportDeclaration({
      namedImports: [{
        name,
      }],
      isTypeOnly: true,
      moduleSpecifier: resultFactoryFunctionFile.getRelativePathTo(inputFile)
        // HACK: this is probably an issue with the test setup
        .replace(/\.ts$/, '')
        .replace(/^(?!\.|\.\.|\/)/, './'),
    })

    resultFactoryFunctionFile.addFunction({
      name: `create${name}`,
      isExported: true,
      parameters: [{
        name: 'overrides',
        hasQuestionToken: true,
        type: `Partial<${name}>`,
      }],
      returnType: name,
    }).setBodyText(writer => {
      return writer.write('return')
        .block(() => {
          members.forEach((m) => {
            if (!Node.isPropertySignature(m)) {
              return
            }
            const structure = m.getStructure();
            writer.writeLine(`${structure.name}: ${fakerGeneratorBySignature(structure)},`)
          })
          writer.writeLine('...overrides,')
        })
    })
    return resultFactoryFunctionFile;
  }

  return {
    project,
    createFactoryFunction,
  }
}

// TODO: consider moving this when it gets to big
export function fakerGeneratorBySignature(property: PropertySignatureStructure): string {
  // TODO: add overrides for common types like email, phoneNumber, etc.
  // TODO: add user-defined overrides as well
  switch (property.type) {
    case 'number':
      return 'faker.number.int()'
    case 'string':
      return 'faker.lorem.word()'
    case 'boolean':
      return 'faker.datatype.boolean()'
    case 'Date':
      return 'faker.date.recent()'
    default:
      // TODO: add more support for complex types
      // TODO: add some console output ease-of-reporting
      return `undefined as unknown as ${property.type}`
  }
}
