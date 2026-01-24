import { processOneOfSchema } from '../../helpers/schema-processing';
import path from 'path';

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
  });
});
