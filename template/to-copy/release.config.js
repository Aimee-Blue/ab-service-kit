'use strict';

const { SemanticRelease } = require('@aimee-blue/ab-scripts');

// NOTE: You can run 'yarn run release --dry-run --debug' to see the config
module.exports = SemanticRelease.buildReleaseConfig({
  appName: require('./package.json').name,
  docker: true,
  infra: true,
});
