import { pathExists, readFile } from 'fs-extra';

const packageJson = 'package.json';

interface IPackageJson {
  version: string;
  name: string;
}

let loadedPackageJson: IPackageJson | undefined;

async function loadPackageJson() {
  if (loadedPackageJson) {
    return loadedPackageJson;
  }

  const packageJsonExists = await pathExists(packageJson);
  if (!packageJsonExists) {
    throw new Error(
      'Cannot find package.json, this application is meant to be run with current package.json in cwd'
    );
  }

  const contents = await readFile(packageJson, {
    encoding: 'utf8',
  });

  loadedPackageJson = JSON.parse(contents) as IPackageJson;

  return loadedPackageJson;
}

export async function appVersion() {
  const loaded = await loadPackageJson();
  return loaded.version;
}

export async function appName() {
  const loaded = await loadPackageJson();
  return loaded.name;
}
