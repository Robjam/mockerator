import { ForInStatement, IndentationText, Node, Project, QuoteKind, SourceFile, ts, TypeLiteralNode, type PropertySignatureStructure, } from 'ts-morph'
import { allLocales } from '@faker-js/faker'

export type Options = {
  locale: keyof typeof allLocales,
}

// TODO: make this more composable with extra options like locale, etc
export function scaffoldProject(options?: Options) {
  const configuration: Options = {
    locale: 'en',
    ...options,
  }
  // TODO: find which settings will need to be exposed
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2023,
    },
    manipulationSettings: {
      indentationText: IndentationText.TwoSpaces,
      quoteKind: QuoteKind.Single,
    }
  });

  async function createFactoryFunction(inputFile: SourceFile): Promise<SourceFile | null> {
    const aliases = inputFile.getTypeAliases();
    if (!aliases.length) {
      return null
    }
    const firstAlias = aliases[0];
    const dumdum = firstAlias?.getTypeNode()
    if (!Node.isTypeLiteral(dumdum)) {
      return null;
    }
    const name = firstAlias?.getName();

    const methods = dumdum.getMembers();
    if (!methods.length) {
      return null;
    }

    const resultFactoryFunctionFile = project.createSourceFile(`results/create${name}.ts`);
    resultFactoryFunctionFile.addImportDeclaration({
      namedImports: [{
        name: `faker${configuration?.locale.toUpperCase()}`,
        alias: 'faker'
      }],
      moduleSpecifier: '@faker-js/faker'
    });
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
