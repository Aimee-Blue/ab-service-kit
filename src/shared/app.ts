import { pathExists, readFile } from 'fs-extra';
import { spawnSync } from 'child_process';
import { Utils } from '@aimee-blue/ab-shared';

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

function determineGitVersion() {
  const gitResult = spawnSync(
    'git',
    ['describe', '--long', '--dirty=+', '--abbrev=10', '--tags'],
    {
      encoding: 'utf8',
    }
  );

  if (gitResult.error || gitResult.status !== 0) {
    return null;
  }

  const gitVersion = gitResult.stdout.trim();

  const versionStr = gitVersion.startsWith('v')
    ? gitVersion.substring(1)
    : gitVersion;

  return versionStr;
}

export const appVersion = Utils.onceAsync(async () => {
  const loaded = await loadPackageJson();
  if (loaded.version === '0.0.0-development') {
    return determineGitVersion() || loaded.version;
  }
  return loaded.version;
});

export const appName = Utils.onceAsync(async () => {
  const loaded = await loadPackageJson();
  return loaded.name;
});
