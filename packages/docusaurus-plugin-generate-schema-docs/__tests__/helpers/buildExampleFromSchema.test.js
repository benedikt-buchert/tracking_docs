import buildExampleFromSchema from '../../helpers/buildExampleFromSchema.js';

describe('buildExampleFromSchema', () => {
  it('should build a basic example from a schema', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' },
        isStudent: { type: 'boolean' },
      },
    };

    const example = buildExampleFromSchema(schema);

    expect(example).toEqual({
      name: '',
      age: 0,
      isStudent: false,
    });
  });

  it('should handle nested objects and arrays', () => {
    const schema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
        posts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              tags: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
      },
    };

    const example = buildExampleFromSchema(schema);

    expect(example).toEqual({
      user: {
        name: '',
      },
      posts: [
        {
          title: '',
          tags: [''],
        },
      ],
    });
  });

  it('should use examples, const, and default values', () => {
    const schema = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          examples: ['John Doe'],
        },
        role: {
          type: 'string',
          const: 'admin',
        },
        level: {
          type: 'integer',
          default: 1,
        },
      },
    };

    const example = buildExampleFromSchema(schema);

    expect(example).toEqual({
      name: 'John Doe',
      role: 'admin',
      level: 1,
    });
  });

  it('should build a complex example', () => {
    const schema = {
      type: 'object',
      properties: {
        event: {
          type: 'string',
          examples: ['purchase'],
        },
        ecommerce: {
          type: 'object',
          properties: {
            transaction_id: {
              type: 'string',
              examples: ['T_12345'],
            },
            value: {
              type: 'number',
              default: 10.0,
            },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  item_id: { type: 'string', examples: ['SKU_123'] },
                  item_name: { type: 'string', examples: ['Stan Smith Shoes'] },
                  price: { type: 'number' },
                  quantity: { type: 'integer', default: 1 },
                },
              },
            },
          },
        },
      },
    };

    const example = buildExampleFromSchema(schema);

    expect(example).toEqual({
      event: 'purchase',
      ecommerce: {
        transaction_id: 'T_12345',
        value: 10.0,
        items: [
          {
            item_id: 'SKU_123',
            item_name: 'Stan Smith Shoes',
            price: 0,
            quantity: 1,
          },
        ],
      },
    });
  });
  it('should not include empty objects for properties with no defined value', () => {
    const schema = {
      type: 'object',
      properties: {
        event: { type: 'string', examples: ['test_event'] },
        user_data: {
          type: 'object',
        },
        ecommerce: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  item_id: { type: 'string', examples: ['SKU_123'] },
                },
              },
            },
          },
        },
        empty_object: {
          type: 'object',
          properties: {},
        },
      },
    };

    const example = buildExampleFromSchema(schema);

    expect(example).toEqual({
      event: 'test_event',
      ecommerce: {
        items: [
          {
            item_id: 'SKU_123',
          },
        ],
      },
    });
  });

  it('should handle if/then/else by defaulting to then branch', () => {
    const schema = {
      type: 'object',
      properties: {
        event: { type: 'string', examples: ['form_submit'] },
      },
      if: { properties: { event: { const: 'form_submit' } } },
      then: {
        properties: {
          form_name: { type: 'string', examples: ['contact'] },
        },
      },
      else: {
        properties: {
          error_code: { type: 'integer', examples: [404] },
        },
      },
    };

    const example = buildExampleFromSchema(schema);
    expect(example).toHaveProperty('event', 'form_submit');
    expect(example).toHaveProperty('form_name', 'contact');
    expect(example).not.toHaveProperty('error_code');
  });

  it('should handle nested if/then/else inside a property', () => {
    const schema = {
      type: 'object',
      properties: {
        shipping: {
          type: 'object',
          properties: {
            method: { type: 'string', examples: ['express'] },
          },
          if: { properties: { method: { const: 'express' } } },
          then: {
            properties: {
              priority: { type: 'string', examples: ['high'] },
            },
          },
        },
      },
    };

    const example = buildExampleFromSchema(schema);
    expect(example.shipping).toHaveProperty('method', 'express');
    expect(example.shipping).toHaveProperty('priority', 'high');
  });

  it('should use example value from a primitive schema that has examples (L19)', () => {
    // primitive with examples — must return example value, not placeholder
    const schema = { type: 'string', examples: ['hello'] };
    expect(buildExampleFromSchema(schema)).toBe('hello');
  });

  it('should use example value from integer schema with examples (L19)', () => {
    const schema = { type: 'integer', examples: [42] };
    expect(buildExampleFromSchema(schema)).toBe(42);
  });

  it('should use the first option from oneOf when items length > 0 (L25)', () => {
    const schema = {
      type: 'object',
      properties: { event: { type: 'string', examples: ['purchase'] } },
      oneOf: [
        {
          title: 'Option A',
          properties: { extra: { type: 'string', examples: ['a'] } },
        },
        {
          title: 'Option B',
          properties: { extra: { type: 'string', examples: ['b'] } },
        },
      ],
    };
    const example = buildExampleFromSchema(schema);
    expect(example).toHaveProperty('extra', 'a');
    expect(example).toHaveProperty('event', 'purchase');
  });

  it('should use the first option from anyOf when items length > 0 (L25)', () => {
    const schema = {
      anyOf: [
        { type: 'string', examples: ['first'] },
        { type: 'string', examples: ['second'] },
      ],
    };
    expect(buildExampleFromSchema(schema)).toBe('first');
  });

  it('should skip if/then branch when there is only if but no then (L34)', () => {
    // schema.if && schema.then — the branch is only entered when both are present
    const schema = {
      type: 'object',
      properties: {
        event: { type: 'string', examples: ['test'] },
        extra: { type: 'string', examples: ['value'] },
      },
      if: { properties: { event: { const: 'test' } } },
      // deliberately no then
      else: {
        properties: {
          error_code: { type: 'integer', examples: [404] },
        },
      },
    };
    const example = buildExampleFromSchema(schema);
    expect(example).toHaveProperty('event', 'test');
    expect(example).toHaveProperty('extra', 'value');
    expect(example).not.toHaveProperty('error_code');
  });

  it('should infer object type from properties when no type is specified (L52)', () => {
    const schema = {
      properties: {
        name: { type: 'string', examples: ['Alice'] },
        age: { type: 'integer', examples: [30] },
      },
    };
    const example = buildExampleFromSchema(schema);
    expect(example).toEqual({ name: 'Alice', age: 30 });
  });

  it('should return undefined for object with type but no properties (L52)', () => {
    const schema = { type: 'object' };
    expect(buildExampleFromSchema(schema)).toBeUndefined();
  });

  it('should handle array type with items (L69)', () => {
    const schema = {
      type: 'array',
      items: { type: 'string', examples: ['tag'] },
    };
    expect(buildExampleFromSchema(schema)).toEqual(['tag']);
  });

  it('should return undefined for array type with no items (L69)', () => {
    const schema = { type: 'array' };
    expect(buildExampleFromSchema(schema)).toBeUndefined();
  });

  it('should return empty string placeholder for string type without examples (L71 fallback)', () => {
    const schema = { type: 'string' };
    expect(buildExampleFromSchema(schema)).toBe('');
  });

  it('should return undefined for an unknown type (L71 fallback)', () => {
    const schema = { type: 'unknown-type' };
    expect(buildExampleFromSchema(schema)).toBeUndefined();
  });

  it('should return false placeholder for boolean type', () => {
    const schema = { type: 'boolean' };
    expect(buildExampleFromSchema(schema)).toBe(false);
  });

  it('should return 0 placeholder for number type', () => {
    const schema = { type: 'number' };
    expect(buildExampleFromSchema(schema)).toBe(0);
  });

  it('should use first type when schema.type is an array (L52)', () => {
    const schema = {
      type: ['string', 'null'],
      examples: ['hello'],
    };
    expect(buildExampleFromSchema(schema)).toBe('hello');
  });

  it('should use first type placeholder when schema.type is array and no examples (L52)', () => {
    const schema = { type: ['integer', 'null'] };
    expect(buildExampleFromSchema(schema)).toBe(0);
  });

  // --- Mutant-killing tests ---

  it('should return undefined for null/undefined schema (L19 guard)', () => {
    expect(buildExampleFromSchema(null)).toBeUndefined();
    expect(buildExampleFromSchema(undefined)).toBeUndefined();
    expect(buildExampleFromSchema(0)).toBeUndefined();
    expect(buildExampleFromSchema(false)).toBeUndefined();
  });

  it('should fall through to primitive placeholder when type is not object/array (L13 default)', () => {
    // Ensures the default branch in getPrimitivePlaceholder returns undefined
    // for unrecognized types, killing the ConditionalExpression mutant on L13-14
    const schema = { type: 'null' };
    expect(buildExampleFromSchema(schema)).toBeUndefined();
  });

  it('should skip oneOf branch when oneOf is an empty array (L25 length > 0)', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', examples: ['Alice'] },
      },
      oneOf: [],
    };
    const example = buildExampleFromSchema(schema);
    expect(example).toEqual({ name: 'Alice' });
  });

  it('should skip anyOf branch when anyOf is an empty array (L25 length > 0)', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', examples: ['Bob'] },
      },
      anyOf: [],
    };
    const example = buildExampleFromSchema(schema);
    expect(example).toEqual({ name: 'Bob' });
  });

  it('should not infer object type when type is explicitly set to a non-object type (L52 && vs ||)', () => {
    // type is 'string' and properties exist — should NOT be treated as object
    // Kills the LogicalOperator mutant that changes && to || on L52
    const schema = {
      type: 'string',
      properties: {
        name: { type: 'string', examples: ['ignored'] },
      },
    };
    const example = buildExampleFromSchema(schema);
    expect(example).toBe('');
  });

  it('should not enter object branch when inferredType is not object (L55 ConditionalExpression true)', () => {
    // type is 'string' with properties — should return string placeholder, not object
    const schema = {
      type: 'string',
      properties: {
        foo: { type: 'integer', examples: [99] },
      },
    };
    expect(buildExampleFromSchema(schema)).toBe('');
  });

  it('should not enter array branch when type is not array but items exists (L69 && vs ||)', () => {
    // type is 'string' with items — should return string placeholder, not array
    const schema = {
      type: 'string',
      items: { type: 'string', examples: ['ignored'] },
    };
    expect(buildExampleFromSchema(schema)).toBe('');
  });

  it('should not enter array branch when type is array but items is missing (L69 ConditionalExpression true)', () => {
    // Already tested above but with strict assertion
    const schema = { type: 'array' };
    const result = buildExampleFromSchema(schema);
    // Should fall through to getPrimitivePlaceholder which returns undefined for 'array'
    expect(result).toBeUndefined();
  });

  it('should return undefined for array items that resolve to undefined (L71)', () => {
    // Array with items that produce undefined — the whole array should be undefined
    const schema = {
      type: 'array',
      items: { type: 'object' }, // object with no properties returns undefined
    };
    expect(buildExampleFromSchema(schema)).toBeUndefined();
  });

  it('should wrap array items value in array, not return empty string (L71 StringLiteral)', () => {
    // Kills the StringLiteral mutant that replaces [itemValue] with ""
    const schema = {
      type: 'array',
      items: { type: 'integer' },
    };
    const result = buildExampleFromSchema(schema);
    expect(result).toEqual([0]);
    expect(Array.isArray(result)).toBe(true);
    expect(result).not.toBe('');
  });

  it('should handle oneOf with null/undefined choiceType length gracefully (L25 OptionalChaining)', () => {
    // oneOf is present but not an array — optional chaining should prevent crash
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string', examples: ['test'] },
      },
      oneOf: null,
    };
    const example = buildExampleFromSchema(schema);
    expect(example).toEqual({ name: 'test' });
  });
});
