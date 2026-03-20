module.exports = {
  overrides: [
    {
      files: ['static/schemas/**/*.json'],
      parser: 'jsonc-eslint-parser',
      plugins: ['json-schema-validator', 'tracking-schema'],
      rules: {
        'json-schema-validator/no-invalid': 'error',
        'tracking-schema/require-description': 'warn',
        'tracking-schema/require-type': 'error',
        'tracking-schema/require-examples': 'warn',
      },
    },
  ],
};
