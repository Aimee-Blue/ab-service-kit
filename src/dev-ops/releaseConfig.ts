interface IReleaseOpts {
  appName: string;
  docker: boolean;
  infra: boolean;
}

export function buildReleaseConfig(opts: IReleaseOpts) {
  const appName = opts.appName;
  const dockApp = `aimeeblue/${appName}`;

  const dockerReleasePlugins = [
    [
      '@semantic-release/exec',
      {
        prepareCmd: 'yarn run ci-build-docker',
      },
    ],
    [
      '@semantic-release/exec',
      {
        verifyReleaseCmd:
          'docker login -u=$DOCKER_USERNAME -p=$DOCKER_PASSWORD',
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
  ];

  const patchInfraPlugins = [
    [
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
  ];

  return {
    branches: [
      '+([0-9])?(.{+([0-9]),x}).x',
      { name: 'release' },
      { name: 'master', channel: 'dev', prerelease: true },
      { name: 'alpha', prerelease: true },
      { name: 'beta', prerelease: true },
    ],
    plugins: [
      '@semantic-release/commit-analyzer',
      '@semantic-release/release-notes-generator',
      '@semantic-release/npm',
      ...((opts.docker && dockerReleasePlugins) || []),
      ...((opts.infra && patchInfraPlugins) || []),
      '@semantic-release/github',
    ],
  };
}
