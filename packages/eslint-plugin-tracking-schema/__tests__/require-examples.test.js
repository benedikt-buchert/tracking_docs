const { RuleTester } = require('eslint');
const rule = require('../rules/require-examples');

const ruleTester = new RuleTester({
  parser: require.resolve('jsonc-eslint-parser'),
});

ruleTester.run('require-examples', rule, {
  valid: [
    // has examples array
    {
      code: JSON.stringify({
        properties: {
          currency: {
            type: 'string',
            description: 'Currency code.',
            examples: ['USD'],
          },
        },
      }),
    },
    // has singular example key
    {
      code: JSON.stringify({
        properties: {
          currency: {
            type: 'string',
            description: 'Currency code.',
            example: 'USD',
          },
        },
      }),
    },
    // const — value is fixed, no example needed
    {
      code: JSON.stringify({
        properties: {
          event: {
            type: 'string',
            const: 'purchase',
            description: 'Event name.',
          },
        },
      }),
    },
    // enum — values are enumerated, no example needed
    {
      code: JSON.stringify({
        properties: {
          country: {
            type: 'string',
            enum: ['US', 'CA'],
            description: 'Country code.',
          },
        },
      }),
    },
    // type object — sub-properties carry their own examples
    {
      code: JSON.stringify({
        properties: {
          ecommerce: { type: 'object', description: 'Ecommerce data.' },
        },
      }),
    },
    // type array — items carry their own examples
    {
      code: JSON.stringify({
        properties: { items: { type: 'array', description: 'List of items.' } },
      }),
    },
    // pure $ref — skip
    {
      code: JSON.stringify({
        properties: { items: { $ref: '../components/items.json' } },
      }),
    },
    // if block — condition schema, not a documented property
    {
      code: JSON.stringify({
        if: { properties: { page_title: { type: 'string' } } },
      }),
    },
    // if block — condition schema, not a documented property
    {
      code: JSON.stringify({
        if: { properties: { page_title: { maxLength: 300 } } },
      }),
    },
    // constraint-only refinement in then block — adds rules to a property defined elsewhere
    {
      code: JSON.stringify({
        then: { properties: { page_title: { maxLength: 300 } } },
      }),
    },
  ],

  invalid: [
    // missing examples on a leaf string property
    {
      code: JSON.stringify({
        properties: {
          currency: { type: 'string', description: 'Currency code.' },
        },
      }),
      errors: [{ message: 'Property "currency" is missing "examples".' }],
    },
    // missing examples on a leaf number property
    {
      code: JSON.stringify({
        properties: {
          value: { type: 'number', description: 'Monetary value.' },
        },
      }),
      errors: [{ message: 'Property "value" is missing "examples".' }],
    },
    // missing examples in else block
    {
      code: JSON.stringify({
        else: {
          properties: {
            province: { type: 'string', description: 'Canadian province.' },
          },
        },
      }),
      errors: [{ message: 'Property "province" is missing "examples".' }],
    },
  ],
});
