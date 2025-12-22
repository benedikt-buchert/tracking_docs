module.exports = {
  testEnvironment: 'jsdom',
  transformIgnorePatterns: [
    'node_modules/(?!(docusaurus-plugin-generate-schema-docs))',
  ],
  moduleNameMapper: {
    '^@theme/CodeBlock$': '<rootDir>/jest.CodeBlock.mock.js',
  },
};
