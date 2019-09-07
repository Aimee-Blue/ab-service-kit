'use strict';

const { DevOps } = require('@aimee-blue/ab-service-kit');

// NOTE: You can run 'yarn run release --dry-run --debug' to see the config
module.exports = DevOps.buildReleaseConfig({
  appName: require('./package.json').name,
  docker: true,
  infra: true,
});
