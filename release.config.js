'use strict';

module.exports = {
  branches: [
    //
    '+([1-9])?(.{+([1-9]),x}).x',
    { name: 'master' },
    { name: 'alpha', channel: 'alpha', prerelease: true },
    { name: 'betta', channel: 'betta', prerelease: true },
  ],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/npm',
    '@semantic-release/github',
  ],
};
