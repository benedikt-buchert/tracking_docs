const requireDescription = require('./rules/require-description');
const requireType = require('./rules/require-type');
const requireExamples = require('./rules/require-examples');

module.exports = {
  rules: {
    'require-description': requireDescription,
    'require-type': requireType,
    'require-examples': requireExamples,
  },
  configs: {
    recommended: {
      plugins: ['tracking-schema'],
      overrides: [
        {
          files: ['**/*.json'],
          parser: 'jsonc-eslint-parser',
          rules: {
            'tracking-schema/require-description': 'warn',
            'tracking-schema/require-type': 'error',
            'tracking-schema/require-examples': 'warn',
          },
        },
      ],
    },
  },
};
