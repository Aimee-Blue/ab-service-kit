'use strict';

module.exports = {
  branches: [
    '+([1-9])?(.{+([1-9]),x}).x',
    { name: 'release' },
    { name: 'master', channel: 'dev', prerelease: true },
  ],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/github',
    '@semantic-release/npm',
  ],
};
