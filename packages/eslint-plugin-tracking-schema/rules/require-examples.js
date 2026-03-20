const {
  PROPERTY_DEFINITION_SELECTOR,
  getKeys,
  isInsideIfBlock,
  isPureRef,
  isConstraintOnlyRefinement,
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
        if (isInsideIfBlock(node)) return;

        const definitionNode = node.value;
        if (definitionNode.type !== 'JSONObjectExpression') return;

        const keys = getKeys(definitionNode);
        if (isPureRef(keys)) return;
        if (isConstraintOnlyRefinement(keys)) return;

        // const and enum already constrain the value — no example needed
        if (keys.has('const') || keys.has('enum')) return;

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
            data: { name: node.key.value ?? node.key.name },
          });
        }
      },
    };
  },
};
