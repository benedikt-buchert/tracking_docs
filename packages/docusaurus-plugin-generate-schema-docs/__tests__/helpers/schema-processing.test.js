/**
 * @jest-environment @stryker-mutator/jest-runner/jest-env/node
 */

import { processOneOfSchema, slugify } from '../../helpers/schema-processing';
import path from 'path';
import fs from 'fs';

describe('schema-processing', () => {
  describe('slugify', () => {
    it('returns "option" for falsy input', () => {
      expect(slugify('')).toBe('option');
      expect(slugify(null)).toBe('option');
      expect(slugify(undefined)).toBe('option');
    });

    it('replaces multiple spaces with a single hyphen', () => {
      expect(slugify('hello   world')).toBe('hello-world');
    });

    it('removes non-word characters', () => {
      expect(slugify('hello!@#world')).toBe('helloworld');
    });

    it('replaces multiple consecutive hyphens with a single hyphen', () => {
      expect(slugify('hello---world')).toBe('hello-world');
    });

    it('trims leading hyphens', () => {
      expect(slugify('-hello')).toBe('hello');
      expect(slugify('--hello')).toBe('hello');
    });

    it('trims trailing hyphens', () => {
      expect(slugify('hello-')).toBe('hello');
      expect(slugify('hello--')).toBe('hello');
    });

    it('converts to lowercase', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });
  });

  describe('processOneOfSchema', () => {
    it('should merge oneOf options with the root schema', async () => {
      const rootSchema = {
        title: 'Root',
        description: 'Root description',
        oneOf: [
          {
            title: 'Option 1',
            description: 'Description for Option 1',
            properties: {
              prop1: { type: 'string' },
            },
          },
          {
            title: 'Option 2',
            properties: {
              prop2: { type: 'number' },
            },
          },
        ],
        properties: {
          commonProp: { type: 'boolean' },
        },
      };

      const filePath = '/path/to/schema.json';
      const result = await processOneOfSchema(rootSchema, filePath);

      expect(result).toHaveLength(2);

      // Check the first merged schema
      expect(result[0].schema.title).toBe('Option 1');
      expect(result[0].schema.description).toBe('Description for Option 1');
      expect(result[0].schema.properties.commonProp).toEqual({
        type: 'boolean',
      });
      expect(result[0].schema.properties.prop1).toEqual({ type: 'string' });
      expect(result[0].schema.oneOf).toBeUndefined();

      // Check the second merged schema
      expect(result[1].schema.title).toBe('Option 2');
      expect(result[1].schema.description).toBe('Root description'); // Fallback
      expect(result[1].schema.properties.prop2).toEqual({ type: 'number' });
      expect(result[1].slug).toBe('option-2');
    });

    it('should use option $id when available', async () => {
      const rootSchema = {
        $id: 'root.json',
        title: 'Root',
        oneOf: [
          {
            $id: 'option1.json',
            title: 'Option 1',
          },
        ],
      };
      const filePath = '/path/to/schema.json';
      const result = await processOneOfSchema(rootSchema, filePath);
      expect(result[0].schema.$id).toBe('option1.json');
    });

    it('should generate a new $id when option $id is not available', async () => {
      const rootSchema = {
        $id: 'root.json',
        title: 'Root',
        oneOf: [
          {
            title: 'Option 1',
          },
        ],
      };
      const filePath = '/path/to/schema.json';
      const result = await processOneOfSchema(rootSchema, filePath);
      expect(result[0].schema.$id).toBe('root.json#option-1');
    });

    it('preserves parent property metadata when an option refines the same property', async () => {
      const rootSchema = {
        $id: 'root.json',
        title: 'Root',
        oneOf: [
          {
            title: 'Purchase',
            properties: {
              ecommerce: {
                type: 'object',
                properties: {
                  transaction_id: { type: 'string' },
                },
              },
            },
          },
        ],
        properties: {
          ecommerce: {
            type: 'object',
            'x-gtm-clear': true,
          },
        },
      };

      const result = await processOneOfSchema(
        rootSchema,
        '/path/to/schema.json',
      );
      const mergedEcommerce = result[0].schema.properties.ecommerce;

      expect(mergedEcommerce['x-gtm-clear']).toBe(true);
      expect(mergedEcommerce.properties.transaction_id.type).toBe('string');
    });

    it('returns an empty array when schema has no oneOf', async () => {
      const schema = {
        $id: 'root.json',
        title: 'Root',
        properties: { foo: { type: 'string' } },
      };
      const result = await processOneOfSchema(schema, '/path/to/schema.json');
      expect(result).toEqual([]);
    });

    it('uses $anchor as slug when option has $anchor but no $id ending in .json', async () => {
      const rootSchema = {
        $id: 'root.json',
        title: 'Root',
        oneOf: [
          {
            $anchor: 'my-anchor',
            title: 'Anchored Option',
          },
        ],
      };
      const result = await processOneOfSchema(
        rootSchema,
        '/path/to/schema.json',
      );
      expect(result[0].slug).toBe('my-anchor');
      expect(result[0].schema.$id).toBe('root.json#my-anchor');
    });

    it('uses basename of $id ending in .json as slug and preserves original $id', async () => {
      const rootSchema = {
        $id: 'root.json',
        title: 'Root',
        oneOf: [
          {
            $id: 'sub/my-option.json',
            title: 'Option With Id',
          },
        ],
      };
      const result = await processOneOfSchema(
        rootSchema,
        '/path/to/schema.json',
      );
      expect(result[0].slug).toBe('my-option');
      expect(result[0].schema.$id).toBe('sub/my-option.json');
    });

    it('does not treat $id not ending in .json as hadId', async () => {
      const rootSchema = {
        $id: 'root.json',
        title: 'Root',
        oneOf: [
          {
            $id: 'not-a-json-file',
            title: 'No Json Extension',
          },
        ],
      };
      const result = await processOneOfSchema(
        rootSchema,
        '/path/to/schema.json',
      );
      expect(result[0].slug).toBe('no-json-extension');
      expect(result[0].schema.$id).toBe('root.json#no-json-extension');
    });

    it('does not resolve $ref that starts with #', async () => {
      const rootSchema = {
        $id: 'root.json',
        title: 'Root',
        oneOf: [
          {
            $ref: '#/definitions/internal',
            title: 'Internal Ref',
          },
        ],
      };
      const result = await processOneOfSchema(
        rootSchema,
        '/path/to/schema.json',
      );
      expect(result[0].schema.$ref).toBe('#/definitions/internal');
      expect(result[0].sourceFilePath).toBeNull();
    });

    it('preserves parent allOf metadata when root oneOf options are file refs', async () => {
      const rootFile = path.join(
        __dirname,
        '..',
        '__fixtures__',
        'schema-processing',
        'event-reference.json',
      );
      const rootSchema = JSON.parse(fs.readFileSync(rootFile, 'utf8'));
      const result = await processOneOfSchema(rootSchema, rootFile);
      const mergedEcommerce = result[0].schema.properties.ecommerce;

      expect(mergedEcommerce['x-gtm-clear']).toBe(true);
      expect(mergedEcommerce.properties.transaction_id.type).toBe('string');
    });
  });
});
