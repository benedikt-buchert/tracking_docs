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

  // Kills mutant 685: && → || on line 20 (normalized.not && typeof ... === 'object')
  // When not is false (falsy non-object), the && guard must prevent entering the block.
  // With ||, the code would try to access .anyOf on false and corrupt the value.
  it('preserves not: false without entering the unwrap block', async () => {
    const filePath = path.join(
      __dirname,
      '..',
      '__fixtures__',
      'validateSchemas',
      'schema-with-not-edge-cases.json',
    );
    const mergedSchema = await processSchema(filePath);

    expect(mergedSchema.properties.falsy_not.not).toBe(false);
  });

  // Kills mutant 686: typeof normalized.not === 'object' → true on line 20
  // The not: true test already exists but we need a strict assertion that the value
  // is exactly true (not transformed into something else by entering the block)
  it('does not enter unwrap block when not is a non-object truthy value', async () => {
    const filePath = path.join(
      __dirname,
      '..',
      '__fixtures__',
      'validateSchemas',
      'schema-with-not-non-object.json',
    );
    const mergedSchema = await processSchema(filePath);

    // Strict check: not must remain boolean true, not be replaced by undefined or an object
    expect(mergedSchema.properties.flag.not).toBe(true);
    expect(typeof mergedSchema.properties.flag.not).toBe('boolean');
  });

  // Kills mutants 694-698: while loop condition mutations on lines 23-25
  // When not is an array, !Array.isArray(candidate) should prevent entering the loop.
  it('does not unwrap when not value is an array', async () => {
    const filePath = path.join(
      __dirname,
      '..',
      '__fixtures__',
      'validateSchemas',
      'schema-with-not-edge-cases.json',
    );
    const mergedSchema = await processSchema(filePath);

    // not: [{ const: 'A' }, { const: 'B' }] should be kept as-is (array, not unwrapped)
    expect(Array.isArray(mergedSchema.properties.not_is_array.not)).toBe(true);
    expect(mergedSchema.properties.not_is_array.not).toEqual([
      { const: 'A' },
      { const: 'B' },
    ]);
  });

  // Kills mutants on while loop: candidate being null after first unwrap iteration
  // not: { anyOf: [null] } — the single anyOf element is null, so after unwrapping
  // the while loop must stop because candidate is null (falsy)
  it('stops unwrapping when anyOf single element is null', async () => {
    const filePath = path.join(
      __dirname,
      '..',
      '__fixtures__',
      'validateSchemas',
      'schema-with-not-edge-cases.json',
    );
    const mergedSchema = await processSchema(filePath);

    // not: { anyOf: [null] } should unwrap to not: null
    expect(mergedSchema.properties.not_with_null_candidate.not).toBeNull();
  });

  // Kills mutant on while loop: anyOf contains an array element
  // not: { anyOf: [[1, 2, 3]] } — the single anyOf element is an array,
  // so on the next iteration !Array.isArray(candidate) stops the loop
  it('stops unwrapping when anyOf single element is itself an array', async () => {
    const filePath = path.join(
      __dirname,
      '..',
      '__fixtures__',
      'validateSchemas',
      'schema-with-not-edge-cases.json',
    );
    const mergedSchema = await processSchema(filePath);

    // not: { anyOf: [[1, 2, 3]] } should unwrap to not: [1, 2, 3]
    expect(mergedSchema.properties.not_anyof_contains_array.not).toEqual([
      1, 2, 3,
    ]);
  });

  // Kills mutants 706-710, 712-714, 717: options/resolve block mutations
  // The constraint resolver must actually resolve the ref and produce correct content.
  // If the options object is {}, resolve is {}, canRead returns undefined, read fails,
  // or encoding is wrong, the schema won't have the expected constraint properties.
  it('constraint resolver produces correct schema content with proper encoding', async () => {
    const filePath = path.join(
      __dirname,
      '..',
      '__fixtures__',
      'validateSchemas',
      'main-schema-with-constraints-ref.json',
    );
    const mergedSchema = await processSchema(filePath);

    // Verify the constraint schema was resolved, read with utf8, and merged correctly
    // These specific values come from the flat-event-params.json constraint schema
    expect(mergedSchema.additionalProperties.type).toEqual([
      'string',
      'number',
      'integer',
      'boolean',
      'null',
    ]);
    expect(mergedSchema.properties.items.type).toBe('array');
    expect(mergedSchema.properties.items.items.type).toBe('object');
    expect(
      mergedSchema.properties.items.items.additionalProperties.type,
    ).toEqual(['string', 'number', 'integer', 'boolean', 'null']);
    // Verify event property is merged from both constraint and original schema
    expect(mergedSchema.properties.event.type).toBe('string');
    expect(mergedSchema.properties.event.const).toBe('screen_view');
    // Verify screen_name from original schema is preserved
    expect(mergedSchema.properties.screen_name.type).toBe('string');
  });
});
