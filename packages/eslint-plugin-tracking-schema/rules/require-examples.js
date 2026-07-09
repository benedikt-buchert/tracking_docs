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
        'Require "examples" on leaf JSON schema property definitions to ensure generated documentation includes concrete values.',
      url: 'https://github.com/benedikt-buchert/tracking_docs',
    },
    schema: [],
    messages: {
      missing: 'Property "{{name}}" is missing "examples".',
    },
  },

  create(context) {
    return {
      [PROPERTY_DEFINITION_SELECTOR](node) {
        const property = getCheckablePropertyDefinition(node);
        if (!property) return;
        const { definitionNode, keys, name } = property;

        // const and enum already constrain the value — no example needed
        if (keys.has('const') || keys.has('enum')) return;

        // oneOf/anyOf/allOf carry examples inside their branches
        if (keys.has('oneOf') || keys.has('anyOf') || keys.has('allOf')) return;

        // object and array types rely on sub-properties / items for examples
        const typeProp = definitionNode.properties.find(
          (p) => (p.key.value ?? p.key.name) === 'type',
        );
        const typeValue = typeProp?.value?.value;
        if (typeValue === 'object' || typeValue === 'array') return;

        if (!keys.has('examples') && !keys.has('example')) {
          context.report({
            node,
            messageId: 'missing',
            data: { name },
          });
        }
      },
    };
  },
};
