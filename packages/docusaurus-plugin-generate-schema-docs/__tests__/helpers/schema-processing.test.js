/**
 * @jest-environment node
 */

import { processOneOfSchema } from '../../helpers/schema-processing';
import path from 'path';
import fs from 'fs';

describe('schema-processing', () => {
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
