import { IndentationText, Node, Project, QuoteKind, SourceFile, ts, TypeLiteralNode, type PropertySignatureStructure, } from 'ts-morph'
import { allLocales } from '@faker-js/faker';
import { join } from 'node:path';

export type Options = {
  locale?: keyof typeof allLocales,
  inputDir?: string,
  outDir?: string
}

// TODO: make this more composable with extra options like locale, etc
export function scaffoldProject(options?: Options) {
  const configuration: Required<Options> = {
    locale: 'en',
    outDir: '',
    inputDir: '.',
    ...options,
  }
  // TODO: find which settings will need to be exposed
  const project = new Project({
    useInMemoryFileSystem: configuration.inputDir === '.' ? true : false,
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

    const methods = typeNode.getMembers();
    if (!methods.length) {
      return null;
    }

    const resultFactoryFunctionFile = project.createSourceFile(join(configuration.outDir, `create${name}.ts`));
    resultFactoryFunctionFile.addImportDeclaration({
      namedImports: [{
        name: `faker${configuration?.locale.toUpperCase()}`,
        alias: 'faker'
      }],
      moduleSpecifier: '@faker-js/faker'
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
        type: name
      }],
      returnType: name,
    }).setBodyText(writer => {
      return writer.write('return')
        .block(() => {
          methods.forEach((m) => {
            if (!Node.isPropertySignature(m)) {
              return
            }
            const stuff = m.getStructure();
            writer.writeLine(`${stuff.name}: ${fakerGeneratorByType(stuff)},`)
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
export function fakerGeneratorByType(property: PropertySignatureStructure) {
  // TODO: add overrides for common types like email, phoneNumber, etc.
  // TODO: add user-defined overrides as well
  switch (property.type) {
    case 'number':
      return 'faker.number.int()'
    case 'string':
      return 'faker.lorem.word()'
    default:
      // TODO: logging
      `undefined as unknown as ${property.type}`
  }
}
