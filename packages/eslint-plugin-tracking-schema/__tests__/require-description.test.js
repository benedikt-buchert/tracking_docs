const { RuleTester } = require('eslint');
const rule = require('../rules/require-description');

const ruleTester = new RuleTester({
  parser: require.resolve('jsonc-eslint-parser'),
});

ruleTester.run('require-description', rule, {
  valid: [
    // has description
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
    // pure $ref — skip, annotation lives in the referenced file
    {
      code: JSON.stringify({
        properties: { items: { $ref: '../components/items.json' } },
      }),
    },
    // if block — condition schema, not a documented property
    {
      code: JSON.stringify({
        if: { properties: { country: { const: 'US' } } },
      }),
    },
    // if block with type constraint — still a condition, not documentation
    {
      code: JSON.stringify({
        if: { properties: { page_title: { type: 'string' } } },
      }),
    },
    // then block — fully annotated
    {
      code: JSON.stringify({
        then: {
          properties: {
            postal_code: {
              type: 'string',
              description: 'US ZIP code.',
              examples: ['90210'],
            },
          },
        },
      }),
    },
    // constraint-only refinement — adds rules to a property defined elsewhere
    {
      code: JSON.stringify({
        then: { properties: { page_title: { maxLength: 300 } } },
      }),
    },
  ],

  invalid: [
    // missing description on a regular property
    {
      code: JSON.stringify({
        properties: { event: { type: 'string', examples: ['click'] } },
      }),
      errors: [{ message: 'Property "event" is missing "description".' }],
    },
    // missing description in then block
    {
      code: JSON.stringify({
        then: {
          properties: { postal_code: { type: 'string', examples: ['90210'] } },
        },
      }),
      errors: [{ message: 'Property "postal_code" is missing "description".' }],
    },
    // missing description in else block
    {
      code: JSON.stringify({
        else: {
          properties: { province: { type: 'string', examples: ['ON'] } },
        },
      }),
      errors: [{ message: 'Property "province" is missing "description".' }],
    },
  ],
});
