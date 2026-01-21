module.exports = {
  extends: [
    'plugin:@docusaurus/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:jest/recommended',
    'prettier',
  ],
  parser: '@babel/eslint-parser',
  parserOptions: {
    requireConfigFile: false,
    babelOptions: {
      presets: [require.resolve('@docusaurus/core/lib/babel/preset')],
    },
  },
  plugins: ['react', 'react-hooks', 'jsx-a11y', 'jest', 'prettier'],
  rules: {
    'prettier/prettier': 'error',
    'react/prop-types': 'off',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
