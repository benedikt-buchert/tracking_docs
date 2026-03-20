const { RuleTester } = require('eslint');
const rule = require('../rules/require-type');

const ruleTester = new RuleTester({
  parser: require.resolve('jsonc-eslint-parser'),
});

ruleTester.run('require-type', rule, {
  valid: [
    // has type
    {
      code: JSON.stringify({
        properties: {
          event: {
            type: 'string',
            description: 'The event name.',
            examples: ['click'],
          },
        },
      }),
    },
    // const implies type — skip
    {
      code: JSON.stringify({
        properties: {
          event: { const: 'click', description: 'The event name.' },
        },
      }),
    },
    // oneOf replaces type — skip
    {
      code: JSON.stringify({
        properties: {
          value: {
            oneOf: [{ type: 'string' }],
            description: 'A value.',
            examples: ['x'],
          },
        },
      }),
    },
    // anyOf replaces type — skip
    {
      code: JSON.stringify({
        properties: {
          value: {
            anyOf: [{ type: 'string' }],
            description: 'A value.',
            examples: ['x'],
          },
        },
      }),
    },
    // allOf replaces type — skip
    {
      code: JSON.stringify({
        properties: {
          value: {
            allOf: [{ type: 'string' }],
            description: 'A value.',
            examples: ['x'],
          },
        },
      }),
    },
    // $ref alongside other keys — type comes from ref
    {
      code: JSON.stringify({
        properties: { value: { $ref: '#/foo', description: 'A value.' } },
      }),
    },
    // pure $ref — skip entirely
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
    // if block constraint-only — skip
    {
      code: JSON.stringify({
        if: { properties: { country: { const: 'US' } } },
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
    // missing type with no structural alternative
    {
      code: JSON.stringify({
        properties: { value: { description: 'A value.', examples: [1] } },
      }),
      errors: [{ message: 'Property "value" is missing "type".' }],
    },
    // missing type in then block
    {
      code: JSON.stringify({
        then: {
          properties: {
            postal_code: { description: 'ZIP code.', examples: ['90210'] },
          },
        },
      }),
      errors: [{ message: 'Property "postal_code" is missing "type".' }],
    },
  ],
});
