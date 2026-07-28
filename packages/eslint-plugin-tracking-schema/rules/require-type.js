const {
  PROPERTY_DEFINITION_SELECTOR,
  getCheckablePropertyDefinition,
} = require('../helpers/property-definition');

const TYPE_ALTERNATIVES = ['$ref', 'const', 'oneOf', 'anyOf', 'allOf'];

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require a "type" (or structural alternative) on every JSON schema property definition to ensure generated documentation shows correct types.',
      url: 'https://github.com/benedikt-buchert/tracking_docs',
    },
    schema: [],
    messages: {
      missing: 'Property "{{name}}" is missing "type".',
    },
  },

  create(context) {
    return {
      [PROPERTY_DEFINITION_SELECTOR](node) {
        const property = getCheckablePropertyDefinition(node);
        if (!property) return;

        if (
          !property.keys.has('type') &&
          !TYPE_ALTERNATIVES.some((k) => property.keys.has(k))
        ) {
          context.report({
            node,
            messageId: 'missing',
            data: { name: property.name },
          });
        }
      },
    };
  },
};
