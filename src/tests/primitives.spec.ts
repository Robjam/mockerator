import { describe, it, expect } from 'vitest'
import { scaffoldProject } from '../generators/main';
import { join } from 'path';
import { readFile } from 'fs/promises';

describe('primitive types', () => {
  /* 
    TODO: consider simplifying this with a it.each(['filename.input.ts'])
    PROS: LOTS less code.
    CONS: Readability and productivity will take a hit. Re. productivity: `.each` 
    trades terseness for diminished debuggability. `.only` `.skip` `.todo` will no longer work
    and commenting out test cases you want to skip is a hassle.
  */
  it('should not generate anything for empty types', async () => {
    const { project, createFactoryFunction } = scaffoldProject({ 
      inputDir: __filename,
      isDryRun: true,
    });
    const typeContents = await readFile(join(__dirname, 'primitives/expectedEmpty.input.ts'))

    const inputFile = project.createSourceFile("__test/primitive/expectedEmpty", typeContents.toString());

    const resultFile = await createFactoryFunction(inputFile);
    await resultFile?.save()
    expect(resultFile).toBeNull()
  })

  it('should generate some primitive values for a simple type', async () => {
    const { project, createFactoryFunction } = scaffoldProject({ 
      inputDir: __filename,
      isDryRun: true,
    });
    const typeContents = await readFile(join(__dirname, 'primitives/simplePrimitive.input.ts'))
    // HACK: Because scaffoldProject uses the `inMemoryFileSystem`, the objects must be created/added individually.
    // TODO: There probably is a better way to do this, but for now it works.
    const inputFile = project.createSourceFile('simplePrimitive.input.ts', typeContents.toString());

    const resultFile = await createFactoryFunction(inputFile);
    if (!resultFile) {
      expect.fail(`SimplePrimitiveTransformationFailed`)
    }
    await resultFile.save();
    const memoryFs = project.getFileSystem();

    const result = await memoryFs.readFile(resultFile.getFilePath())
    await expect(result).toMatchFileSnapshot(join(__dirname, 'primitives/simplePrimitive.snapshot.ts'))
  })
})
