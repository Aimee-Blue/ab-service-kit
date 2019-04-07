import dotenvExpand from 'dotenv-expand';
import dotenv from 'dotenv';
import fs, { pathExists } from 'fs-extra';

const defaults = ['.env.local', '.env'];

const packageJson = 'package.json';

export async function loadEnv(envFile?: string) {
  const files = envFile ? [envFile, ...defaults] : defaults;

  const packageJsonExists = await pathExists(packageJson);
  if (!packageJsonExists) {
    throw new Error(
      'Cannot find package.json, this application is meant to be run with current package.json in cwd'
    );
  }

  files.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      console.log(`- Loading ${filePath}`);
      dotenvExpand(
        dotenv.config({
          path: filePath,
        })
      );
    }
  });
}
