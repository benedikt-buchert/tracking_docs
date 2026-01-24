module.exports = {
  extends: [
    'plugin:@docusaurus/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:jest/recommended',
    'plugin:json-schema-validator/recommended',
    'plugin:prettier/recommended',
  ],
  parser: '@babel/eslint-parser',
  parserOptions: {
    requireConfigFile: false,
    babelOptions: {
      presets: [require.resolve('@docusaurus/core/lib/babel/preset')],
    },
  },
  plugins: [
    'react',
    'react-hooks',
    'jsx-a11y',
    'jest',
    'prettier',
    'json-schema-validator',
  ],
  rules: {
    'prettier/prettier': 'error',
    'react/prop-types': 'off',
    'json-schema-validator/no-invalid': 'error',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  overrides: [
    {
      files: ['*.json', '*.json5', '*.jsonc'],
      parser: 'jsonc-eslint-parser',
    },
  ],
};
