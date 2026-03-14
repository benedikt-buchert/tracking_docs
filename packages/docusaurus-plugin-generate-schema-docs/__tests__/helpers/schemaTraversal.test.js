const {
  visitSchemaNodes,
  visitSchemaPropertyEntries,
} = require('../../helpers/schemaTraversal.cjs');

describe('schemaTraversal', () => {
  it('visits nested choice and conditional schema nodes', () => {
    const schema = {
      type: 'object',
      properties: {
        payment_method: {
          oneOf: [
            {
              properties: {
                card_number: { type: 'string' },
              },
            },
          ],
        },
      },
      if: {
        properties: {
          platform: { const: 'ios' },
        },
      },
      then: {
        properties: {
          att_status: { type: 'string' },
        },
      },
    };

    const visitedPaths = [];
    visitSchemaNodes(schema, (_node, context) => {
      visitedPaths.push(context.path.join('.'));
    });

    expect(visitedPaths).toEqual(
      expect.arrayContaining([
        '',
        'properties.payment_method',
        'properties.payment_method.oneOf.0',
        'properties.payment_method.oneOf.0.properties.card_number',
        'if',
        'then',
        'then.properties.att_status',
      ]),
    );
  });

  it('collects property entries through object, array, choice, and conditional branches', () => {
    const schema = {
      type: 'object',
      properties: {
        event: { type: 'string' },
        items: {
          type: 'array',
          items: {
            properties: {
              sku: { type: 'string' },
            },
          },
        },
        contact_method: {
          type: 'object',
          oneOf: [
            {
              properties: {
                email: { type: 'string' },
              },
            },
            {
              properties: {
                phone_number: { type: 'string' },
              },
            },
          ],
        },
      },
      then: {
        properties: {
          att_status: { type: 'string' },
        },
      },
      else: {
        properties: {
          ad_personalization_enabled: { type: 'boolean' },
        },
      },
    };

    const variableNames = [];
    visitSchemaPropertyEntries(schema, (_property, context) => {
      variableNames.push(context.name);
    });

    expect(variableNames).toEqual(
      expect.arrayContaining([
        'event',
        'items',
        'items.0.sku',
        'contact_method',
        'contact_method.email',
        'contact_method.phone_number',
        'att_status',
        'ad_personalization_enabled',
      ]),
    );
  });
});
