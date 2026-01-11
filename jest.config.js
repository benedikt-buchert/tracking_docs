module.exports = {
  testEnvironment: "jsdom",
  transformIgnorePatterns: [
    "node_modules/(?!(docusaurus-plugin-generate-schema-docs|@apidevtools/json-schema-ref-parser))",
  ],
  moduleNameMapper: {
    "^@theme/CodeBlock$": "<rootDir>/jest.CodeBlock.mock.js",
    "^@theme/Heading$": "<rootDir>/jest.Heading.mock.js",
    "^@theme/Tabs$": "<rootDir>/jest.Tabs.mock.js",
    "^@theme/TabItem$": "<rootDir>/jest.TabItem.mock.js",
    "\\.(css|less|sass|scss)$": "<rootDir>/jest.css.mock.js",
  },
};
