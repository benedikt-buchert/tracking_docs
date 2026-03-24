module.exports = {
  testEnvironment: '@stryker-mutator/jest-runner/jest-env/jsdom',
  roots: ['<rootDir>/packages', '<rootDir>/scripts'],
  transformIgnorePatterns: [
    'node_modules/(?!(docusaurus-plugin-generate-schema-docs|@apidevtools/json-schema-ref-parser))',
  ],
  collectCoverageFrom: [
    'packages/**/*.js',
    '!packages/**/__tests__/**',
    '!packages/**/__mocks__/**',
    '!packages/**/test-data/**',
    '!packages/**/components/**',
    '!packages/**/scripts/**',
  ],
  coverageReporters: ['json', 'text-summary'],
  coverageDirectory: 'coverage',
  moduleNameMapper: {
    '^@theme/CodeBlock$': '<rootDir>/__mocks__/jest.CodeBlock.mock.js',
    '^@theme/Heading$': '<rootDir>/__mocks__/jest.Heading.mock.js',
    '^@theme/Tabs$': '<rootDir>/__mocks__/jest.Tabs.mock.js',
    '^@theme/TabItem$': '<rootDir>/__mocks__/jest.TabItem.mock.js',
    '\\.(css|less|sass|scss)$': '<rootDir>/__mocks__/jest.css.mock.js',
  },
};
