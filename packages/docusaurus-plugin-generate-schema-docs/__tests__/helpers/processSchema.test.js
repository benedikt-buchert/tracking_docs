/**
 * @jest-environment node
 */

import path from 'path';
import processSchema from '../../helpers/processSchema';

describe('processSchema', () => {
    it('should bundle refs and return a merged schema', async () => {
        const filePath = path.join(__dirname, '..', '__fixtures__', 'validateSchemas', 'main-schema-with-ref.json');
        const mergedSchema = await processSchema(filePath);

        expect(mergedSchema.title).toBe('Main Schema with Ref');
        expect(mergedSchema.properties.component.$ref).toBeUndefined();
        expect(mergedSchema.properties.component.type).toBe('object');
        expect(mergedSchema.properties.component.properties.prop.type).toBe('string');
    });

    it('should handle circular references correctly', async () => {
        const filePath = path.join(__dirname, '..', '__fixtures__', 'validateSchemas', 'circular-schema.json');
        const mergedSchema = await processSchema(filePath);

        expect(mergedSchema.title).toBe('Circular Schema');
        expect(mergedSchema.properties.parent.$ref).toBe('#');
    });

    it('should handle multi-file circular references and produce a self-contained schema', async () => {
        const filePath = path.join(__dirname, '..', '__fixtures__', 'validateSchemas', 'schema-A.json');
        const mergedSchema = await processSchema(filePath);

        expect(mergedSchema.title).toBe('Schema A');
        expect(mergedSchema.properties.b.$ref).toBeUndefined();
        expect(mergedSchema.properties.b.title).toBe('Schema B');
        expect(mergedSchema.properties.b.properties.a.$ref).toBe('#');
    });
});
