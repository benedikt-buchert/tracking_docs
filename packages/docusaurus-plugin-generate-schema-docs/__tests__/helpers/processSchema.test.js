/**
 * @jest-environment @stryker-mutator/jest-runner/jest-env/node
 */

import path from 'path';
import processSchema from '../../helpers/processSchema';

describe('processSchema', () => {
  it('should bundle refs and return a merged schema', async () => {
    const filePath = path.join(
      __dirname,
      '..',
      '__fixtures__',
      'validateSchemas',
      'main-schema-with-ref.json',
    );
    const mergedSchema = await processSchema(filePath);

    expect(mergedSchema.title).toBe('Main Schema with Ref');
    expect(mergedSchema.properties.component.$ref).toBeUndefined();
    expect(mergedSchema.properties.component.type).toBe('object');
    expect(mergedSchema.properties.component.properties.prop.type).toBe(
      'string',
    );
  });

  it('should handle circular references correctly', async () => {
    const filePath = path.join(
      __dirname,
      '..',
      '__fixtures__',
      'validateSchemas',
      'circular-schema.json',
    );
    const mergedSchema = await processSchema(filePath);

    expect(mergedSchema.title).toBe('Circular Schema');
    expect(mergedSchema.properties.parent.$ref).toBe('#');
  });

  it('should handle multi-file circular references and produce a self-contained schema', async () => {
    const filePath = path.join(
      __dirname,
      '..',
      '__fixtures__',
      'validateSchemas',
      'schema-A.json',
    );
    const mergedSchema = await processSchema(filePath);

    expect(mergedSchema.title).toBe('Schema A');
    expect(mergedSchema.properties.b.$ref).toBeUndefined();
    expect(mergedSchema.properties.b.title).toBe('Schema B');
    expect(mergedSchema.properties.b.properties.a.$ref).toBe('#');
  });

  it('resolves published /constraints refs when bundling and merging allOf', async () => {
    const filePath = path.join(
      __dirname,
      '..',
      '__fixtures__',
      'validateSchemas',
      'main-schema-with-constraints-ref.json',
    );
    const mergedSchema = await processSchema(filePath);

    expect(mergedSchema.title).toBe('Main Schema with Constraints Ref');
    expect(mergedSchema.additionalProperties).toEqual(
      expect.objectContaining({
        type: expect.arrayContaining([
          'string',
          'number',
          'integer',
          'boolean',
          'null',
        ]),
      }),
    );
    expect(mergedSchema.properties.items).toEqual(
      expect.objectContaining({
        type: 'array',
      }),
    );
  });

  it('keeps simple not const constraints readable after allOf merge', async () => {
    const filePath = path.join(
      __dirname,
      '..',
      '__fixtures__',
      'validateSchemas',
      'main-schema-with-not-allof.json',
    );
    const mergedSchema = await processSchema(filePath);

    expect(mergedSchema.properties.country).toEqual(
      expect.objectContaining({
        type: 'string',
        not: { const: 'US' },
      }),
    );
  });

  // L20: unwrapRedundantNotAnyOf — not: { anyOf: [single] } is unwrapped to the single item
  it('unwraps not: { anyOf: [singleItem] } to the single item', async () => {
    const filePath = path.join(
      __dirname,
      '..',
      '__fixtures__',
      'validateSchemas',
      'schema-with-not-anyof.json',
    );
    const mergedSchema = await processSchema(filePath);

    // not: { anyOf: [{ const: 'US' }] } should become not: { const: 'US' }
    expect(mergedSchema.properties.country.not).toEqual({ const: 'US' });
    // The anyOf wrapper should be gone
    expect(mergedSchema.properties.country.not.anyOf).toBeUndefined();
  });

  // L22-28: chained anyOf unwrapping (double-wrapped)
  it('unwraps doubly-nested not: { anyOf: [{ anyOf: [item] }] } recursively', async () => {
    const filePath = path.join(
      __dirname,
      '..',
      '__fixtures__',
      'validateSchemas',
      'schema-with-not-anyof.json',
    );
    const mergedSchema = await processSchema(filePath);

    // nested.code has not: { anyOf: [{ anyOf: [{ const: 'XX' }] }] }
    // After two passes of unwrapping it should become not: { const: 'XX' }
    expect(mergedSchema.properties.nested.properties.code.not).toEqual({
      const: 'XX',
    });
  });

  // L11-12: arrays are traversed recursively
  it('unwraps not inside array items', async () => {
    const filePath = path.join(
      __dirname,
      '..',
      '__fixtures__',
      'validateSchemas',
      'schema-with-not-anyof.json',
    );
    const mergedSchema = await processSchema(filePath);

    // items array contains an object with not: { anyOf: [{ const: 'forbidden' }] }
    // After unwrapping it should be not: { const: 'forbidden' }
    const firstItem = mergedSchema.properties.items.items[0];
    expect(firstItem.not).toEqual({ const: 'forbidden' });
  });

  // L20: not value is not an object — should be returned as-is (no crash)
  it('handles not: true (non-object) without unwrapping', async () => {
    const filePath = path.join(
      __dirname,
      '..',
      '__fixtures__',
      'validateSchemas',
      'schema-with-not-non-object.json',
    );
    const mergedSchema = await processSchema(filePath);

    // not: true should be kept as-is (it is not an object, so no unwrapping)
    expect(mergedSchema.properties.flag.not).toBe(true);
  });

  // L20: not value is an object but has no anyOf — not unwrapped
  it('leaves not: { const: X } alone when there is no anyOf wrapper', async () => {
    const filePath = path.join(
      __dirname,
      '..',
      '__fixtures__',
      'validateSchemas',
      'schema-with-not-non-object.json',
    );
    const mergedSchema = await processSchema(filePath);

    expect(mergedSchema.properties.name.not).toEqual({ const: 'forbidden' });
  });

  // L46-49: options object — mutateInputSchema: false preserves original schema
  it('does not mutate the original bundled schema (mutateInputSchema: false)', async () => {
    // If mutateInputSchema were true, the original file's schema could be modified.
    // We verify the result is correct, which only works if bundling is non-destructive.
    const filePath = path.join(
      __dirname,
      '..',
      '__fixtures__',
      'validateSchemas',
      'main-schema-with-ref.json',
    );
    const result1 = await processSchema(filePath);
    const result2 = await processSchema(filePath);

    // Running processSchema twice on the same file should yield the same results,
    // which would fail if the input schema was mutated on the first call.
    expect(result1.title).toBe(result2.title);
    expect(result1.properties.component.type).toBe(
      result2.properties.component.type,
    );
  });

  // L51-59: canRead / read resolver — constraint refs are handled
  it('resolves constraint schema refs via the custom resolver', async () => {
    const filePath = path.join(
      __dirname,
      '..',
      '__fixtures__',
      'validateSchemas',
      'main-schema-with-constraints-ref.json',
    );
    // If the resolver is broken, this will throw. It passing means read() ran successfully.
    const mergedSchema = await processSchema(filePath);
    expect(mergedSchema).toBeDefined();
    expect(mergedSchema.title).toBe('Main Schema with Constraints Ref');
  });

  // L27: anyOf with length > 1 stops the while loop early
  it('does not unwrap not: { anyOf: [a, b] } when anyOf has multiple items', async () => {
    const filePath = path.join(
      __dirname,
      '..',
      '__fixtures__',
      'validateSchemas',
      'schema-with-not-anyof-multi.json',
    );
    const mergedSchema = await processSchema(filePath);

    // not: { anyOf: [{ const: 'US' }, { const: 'CA' }] } should NOT be unwrapped
    expect(mergedSchema.properties.country.not).toEqual({
      anyOf: [{ const: 'US' }, { const: 'CA' }],
    });
  });
});
