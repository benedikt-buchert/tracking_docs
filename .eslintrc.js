module.exports = {
  extends: ['plugin:@docusaurus/recommended'],
  parser: '@babel/eslint-parser',
  parserOptions: {
    requireConfigFile: false,
    babelOptions: {
      presets: [require.resolve('@docusaurus/core/lib/babel/preset')],
    },
  },
};