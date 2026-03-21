import { mergeSchema } from '../../helpers/mergeSchema';

describe('mergeSchema', () => {
  it('merges allOf into a single schema', () => {
    const result = mergeSchema({
      allOf: [
        { type: 'object', properties: { a: { type: 'string' } } },
        { type: 'object', properties: { b: { type: 'number' } } },
      ],
    });

    expect(result.properties).toEqual({
      a: { type: 'string' },
      b: { type: 'number' },
    });
  });

  it('preserves $defs via the baseResolvers', () => {
    const result = mergeSchema({
      allOf: [
        {
          type: 'object',
          $defs: { shared: { type: 'string' } },
          properties: { a: { type: 'string' } },
        },
        {
          type: 'object',
          $defs: { other: { type: 'number' } },
          properties: { b: { type: 'number' } },
        },
      ],
    });

    expect(result.$defs).toEqual({
      shared: { type: 'string' },
      other: { type: 'number' },
    });
  });

  it('passes custom resolvers through to json-schema-merge-allof', () => {
    const customTitleResolver = (values) => values.join(' + ');

    const result = mergeSchema(
      {
        allOf: [
          {
            type: 'object',
            title: 'Foo',
            properties: { a: { type: 'string' } },
          },
          {
            type: 'object',
            title: 'Bar',
            properties: { b: { type: 'number' } },
          },
        ],
      },
      { resolvers: { title: customTitleResolver } },
    );

    expect(result.title).toBe('Foo + Bar');
  });

  it('works without custom options', () => {
    const result = mergeSchema({
      allOf: [{ type: 'object', properties: { x: { type: 'boolean' } } }],
    });

    expect(result.properties.x).toEqual({ type: 'boolean' });
  });

  it('merges additional options beyond resolvers', () => {
    // ignoreAdditionalProperties is a real json-schema-merge-allof option
    const result = mergeSchema(
      {
        allOf: [
          {
            type: 'object',
            properties: { a: { type: 'string' } },
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: { b: { type: 'number' } },
          },
        ],
      },
      { ignoreAdditionalProperties: true },
    );

    expect(result.properties.a).toEqual({ type: 'string' });
    expect(result.properties.b).toEqual({ type: 'number' });
  });
});
