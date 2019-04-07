'use strict';

module.exports = function(wallaby) {
  const babel = wallaby.compilers.babel({
    babel: require('@babel/core'),
  });

  return {
    files: [
      'src/**/*.ts',
      '!src/**/__tests__/**/*.test.ts',
      '!src/**/__tests__/**/*.test.js',
    ],

    tests: ['src/**/__tests__/**/*.test.ts', 'src/**/__tests__/**/*.test.js'],

    env: {
      type: 'node',
      runner: 'node',
    },

    testFramework: 'jest',

    preprocessors: {
      'src/**/*.js': babel,
    },

    hints: {
      ignoreCoverage: /istanbul ignore next/,
    },

    debug: true,
  };
};
