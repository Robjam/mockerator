import { buildApplication, buildCommand, numberParser } from '@stricli/core';
import { name, version, description } from '../package.json';
import { access, constants, mkdir } from 'node:fs/promises'

const command = buildCommand({
  loader: async () => import('./impl'),
  parameters: {
    positional: {
      kind: 'tuple',
      parameters: [
        {
          brief: 'input directory glob',
          parse: String,
        },
      ],
    },
    flags: {
      outDir: {
        brief: 'directory to save generated files',
        optional: false,
        kind: 'parsed',
        parse: checkDirectory,
      },
      locale: {
        brief: 'set the locale',
        optional: true,
        kind: 'parsed',
        parse: (input: any) => input ?? 'en' as any,
      }
    },
  },
  docs: {
    brief: description,
  },
});

async function checkDirectory(path: string): Promise<string> {
  try {
    await access(path, constants.F_OK | constants.W_OK);
  } catch (err) {
    if (!(err instanceof Error) || !('code' in err)) {
      throw err
    }
    let error: Error & { code: any } = err
    if (error.code === 'ENOENT') {
      await mkdir(path, { recursive: true }).catch(error => {
        if (err instanceof Error && 'code' in err) {
          if (err.code === 'ENOENT') {
            throw new Error(`Directory '${path}' could not be created`);
          }
          error = err;
        } else {
          throw error;
        }
      });
      await access(path, constants.F_OK | constants.W_OK).catch((error) => {
        if (err instanceof Error && 'code' in err) {
          error = err;
        } else {
          throw error;
        }
      });
    }
    if (error.code === 'EACCES') {
      throw new Error(`Directory '${path}' exists but is not writable`);
    }
  }

  return path;
}

export const app = buildApplication(command, {
  name,
  versionInfo: {
    currentVersion: version,
  },
});
