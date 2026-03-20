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
        'tracking-schema/require-examples': 'error',
      },
    },
    {
      // Component schemas are shared $ref fragments — examples belong on the
      // event schemas that reference them, not on the components themselves.
      files: ['static/schemas/**/components/*.json'],
      rules: {
        'tracking-schema/require-examples': 'off',
      },
    },
  ],
};
