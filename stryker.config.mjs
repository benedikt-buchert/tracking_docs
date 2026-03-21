/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  testRunner: 'jest',
  jest: {
    configFile: 'jest.stryker.config.js',
  },
  mutate: [
    'packages/*/!(*.test|*.spec).js',
    'packages/**/!(*.test|*.spec).js',
    '!packages/**/__tests__/**',
    '!packages/**/__mocks__/**',
    '!packages/**/test-data/**',
    '!packages/**/scripts/**',
    '!packages/**/components/**',
  ],
  incremental: true,
  incrementalFile: 'reports/mutation/stryker-incremental.json',
  ignorePatterns: ['native-tests', 'demo', '.stryker-tmp'],
  reporters: ['html', 'clear-text', 'progress', 'json'],
  htmlReporter: {
    fileName: 'reports/mutation/index.html',
  },
  coverageAnalysis: 'perTest',
  thresholds: {
    high: 80,
    low: 60,
    break: 0,
  },
};

export default config;
