import { describe, it, expect } from 'vitest'
import { scaffoldProject } from '../generators/main';
import { join } from 'path';
import { readFile } from 'fs/promises';

describe('primitive types', () => {
  /* 
    TODO: consider simplifying this with a it.each(['filename.input.ts'])
    PROS: LOTS less code.
    CONS: Readability and productivity will take a hit. Re. productivity: `.each` 
    trades terseness for diminished debugability. `.only` `.skip` `.todo` will no longer work
    and commenting out test cases you want to skip.
  */
  it('should not generate anything for empty types', async () => {
    type ExpectedEmpty = {};

    const { project, createFactoryFunction } = scaffoldProject();
    const typeContents = await readFile(join(__dirname, 'primitives/ExpectedEmpty.input.ts'))

    const inputFile = project.createSourceFile("__test/primitive/ExpectedEmpty", typeContents.toString());

    const resultFile = await createFactoryFunction(inputFile);
    expect(resultFile).toBeNull()
  })

  it('should generate some primitive values for a simple type', async () => {
    const { project, createFactoryFunction } = scaffoldProject();
    const typeContents = await readFile(join(__dirname, 'primitives/SimplePrimitive.input.ts'))
    // HACK: Because scaffoldProject uses the `inMemoryFileSystem`, the objects must be created/added individually.
    // TODO: There probably is a better way to do this, but for now it works.
    const inputFile = project.createSourceFile('primities/SimplePrimitive.input.ts', typeContents.toString());

    const resultFile = await createFactoryFunction(inputFile);
    if (!resultFile) {
      expect.fail(`SimplePrimitiveTransformationFailed`)
    }
    await resultFile.save();
    const memoryFs = project.getFileSystem();

    const result = await memoryFs.readFile(resultFile.getFilePath())
    await expect(result).toMatchFileSnapshot('primitives/SimplePrimitive.snapshot.ts')
  })
})
