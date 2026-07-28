const {
  PROPERTY_DEFINITION_SELECTOR,
  getCheckablePropertyDefinition,
} = require('../helpers/property-definition');

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require a "description" on every JSON schema property definition to ensure generated documentation is meaningful.',
      url: 'https://github.com/benedikt-buchert/tracking_docs',
    },
    schema: [],
    messages: {
      missing: 'Property "{{name}}" is missing "description".',
    },
  },

  create(context) {
    return {
      [PROPERTY_DEFINITION_SELECTOR](node) {
        const property = getCheckablePropertyDefinition(node);
        if (!property) return;

        if (!property.keys.has('description')) {
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
