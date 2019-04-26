'use strict';

const shouldReleaseToDocker = false;
const shouldPatchInfra = false;

const appName = require('./package.json').name;
const dockApp = `aimeeblue/${appName}`;

const dockerReleasePlugins = [
  [
    '@semantic-release/exec',
    {
      prepareCmd: 'yarn run build-docker',
    },
  ],
  [
    '@semantic-release/exec',
    {
      verifyReleaseCmd: 'docker login -u=$DOCKER_USERNAME -p=$DOCKER_PASSWORD',
      publishCmd:
        'docker tag ' +
        dockApp +
        ':latest ' +
        dockApp +
        ':${nextRelease.version} && docker push ' +
        dockApp +
        ':${nextRelease.version} && docker tag ' +
        dockApp +
        ':latest ' +
        dockApp +
        ':${nextRelease.channel || "latest"} && docker push ' +
        dockApp +
        ':${nextRelease.channel || "latest"} ',
    },
  ],
  shouldPatchInfra && [
    '@semantic-release/exec',
    {
      verifyReleaseCmd:
        `patch-infra-config -p ${appName}.image -v ` +
        dockApp +
        ':${nextRelease.version} ' +
        '-b ${branch.name} --dry-run',
      publishCmd:
        `patch-infra-config -p ${appName}.image -v ` +
        dockApp +
        ':${nextRelease.version} ' +
        '-b ${branch.name}',
    },
  ],
].filter(Boolean);

module.exports = {
  branches: [
    //
    '+([1-9])?(.{+([1-9]),x}).x',
    { name: 'release' },
    { name: 'master', channel: 'dev', prerelease: true },
    { name: 'test', prerelease: true },
  ],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/npm',
    ...((shouldReleaseToDocker && dockerReleasePlugins) || []),
    '@semantic-release/github',
  ],
};
