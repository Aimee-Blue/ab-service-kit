import dotenvExpand from 'dotenv-expand';
import dotenv from 'dotenv';
import fs, { pathExists } from 'fs-extra';
import { BasicLogger, defaultBasicLogger } from './logging';

const loadedVars = new Map<string, string>();

const defaults = ['.env.local', '.env'];

const packageJson = 'package.json';

interface ILoadEnvParams {
  envFile?: string;
  verbosity?: 0 | 1 | 2;
  reset?: boolean;
  logger?: BasicLogger;
}

export function envVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (value) {
    return value;
  }

  if (typeof defaultValue === 'undefined') {
    throw new Error(`${name} environment variable is not set`);
  }

  return defaultValue;
}

export async function loadEnv(
  params: ILoadEnvParams = {
    verbosity: 0,
    reset: false,
  }
) {
  const envFile = params.envFile;
  const files = envFile ? [envFile, ...defaults] : defaults;
  const logger = params.logger || defaultBasicLogger();

  const packageJsonExists = await pathExists(packageJson);
  if (!packageJsonExists) {
    throw new Error(
      'Cannot find package.json, this application is meant to be run with current package.json in cwd'
    );
  }

  if (params.reset) {
    for (const key of loadedVars.keys()) {
      if (typeof params.verbosity === 'number' && params.verbosity >= 2) {
        logger.log(`${key}=...`);
      }
      delete process.env[key];
    }
    loadedVars.clear();
  }

  files.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      return;
    }

    if (typeof params.verbosity === 'number' && params.verbosity >= 1) {
      logger.log(`- Loading ${filePath}`);
    }

    const result = dotenvExpand(
      dotenv.config({
        path: filePath,
      })
    );

    const parsed = result.parsed;

    if (!parsed) {
      return;
    }

    Object.entries(parsed).forEach(([key, value]) => {
      loadedVars.set(key, value);

      if (typeof params.verbosity === 'number' && params.verbosity >= 2) {
        logger.log(`${key}=${parsed[key]}`);
      }
    });
  });
}
