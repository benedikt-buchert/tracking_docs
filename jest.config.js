module.exports = {
  testEnvironment: 'jsdom',
  transformIgnorePatterns: [
    'node_modules/(?!(docusaurus-plugin-generate-schema-docs|@apidevtools/json-schema-ref-parser))',
  ],
  moduleNameMapper: {
    '^@theme/CodeBlock$': '<rootDir>/jest.CodeBlock.mock.js',
  },
};
