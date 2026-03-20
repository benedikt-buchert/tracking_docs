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
        if (isInsideIfBlock(node)) return;

        const definitionNode = node.value;
        if (definitionNode.type !== 'JSONObjectExpression') return;

        const keys = getKeys(definitionNode);
        if (isPureRef(keys)) return;
        if (isConstraintOnlyRefinement(keys)) return;

        if (!keys.has('description')) {
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
