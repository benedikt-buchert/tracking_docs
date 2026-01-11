/**
 * @jest-environment node
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import validateSchemas from '../validateSchemas';

describe('validateSchemas', () => {
    let tmpDir;
    let consoleErrorSpy;
    let consoleLogSpy;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-test-'));
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => { });
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        jest.restoreAllMocks();
    });

    const writeSchema = (dir, fileName, content) => {
        const filePath = path.join(dir, fileName);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    };

    const loadFixture = (fixtureName) => {
        const fixturePath = path.resolve(__dirname, '__fixtures__', 'validateSchemas', fixtureName);
        const schemaContent = fs.readFileSync(fixturePath, 'utf8');
        return JSON.parse(schemaContent);
    };

    it('should return true when all schemas are valid', async () => {
        const validSchema = loadFixture('valid-schema.json');
        writeSchema(tmpDir, 'valid-schema.json', validSchema);

        const result = await validateSchemas(tmpDir);
        expect(result).toBe(true);
        expect(consoleLogSpy).toHaveBeenCalledWith('✅ Schema valid-schema.json produced a valid example.');
    });

    it('should return false if an example fails validation', async () => {
        const invalidExampleSchema = loadFixture('invalid-example-schema.json');
        writeSchema(tmpDir, 'invalid-example-schema.json', invalidExampleSchema);

        const result = await validateSchemas(tmpDir);
        expect(result).toBe(false);
        expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Schema invalid-example-schema.json example data failed validation:');
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({
                instancePath: '/age',
                keyword: 'type',
                message: 'must be number'
            })
        ]));
    });

    it('should fail validation for missing required property', async () => {
        const noValidExampleSchema = loadFixture('no-example-schema.json');
        writeSchema(tmpDir, 'no-valid-example-schema.json', noValidExampleSchema);

        const result = await validateSchemas(tmpDir);
        expect(result).toBe(false);
        expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Schema no-valid-example-schema.json example data failed validation:');
        expect(consoleErrorSpy).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({
                keyword: 'required',
                params: { missingProperty: 'some_prop' },
            })
        ]));
    });

    it('should handle schemas with $refs correctly', async () => {
        const componentSchema = loadFixture(path.join('components', 'referenced.json'));
        const mainSchema = loadFixture('main-schema-with-ref.json');

        writeSchema(path.join(tmpDir, 'components'), 'referenced.json', componentSchema);
        writeSchema(tmpDir, 'main-schema-with-ref.json', mainSchema);

        const result = await validateSchemas(tmpDir);
        expect(result).toBe(true);
        expect(consoleLogSpy).toHaveBeenCalledWith('✅ Schema main-schema-with-ref.json produced a valid example.');
    });

    it('should reject if a referenced schema is missing', async () => {
        const mainSchema = loadFixture('main-schema-with-missing-ref.json');
        writeSchema(tmpDir, 'main-schema-with-missing-ref.json', mainSchema);

        const expectedErrorPath = path.join(tmpDir, 'non-existent-component.json');
        await expect(validateSchemas(tmpDir)).rejects.toThrow(expect.objectContaining({
            message: expect.stringContaining(`Error opening file ${expectedErrorPath}`)
        }));
    });

    it('should throw an error if duplicate schema IDs are found', async () => {
        const schemaA = { $id: 'duplicate-id', type: 'object', properties: { a: { type: 'string' } } };
        const schemaB = { $id: 'duplicate-id', type: 'object', properties: { b: { type: 'string' } } };
        writeSchema(path.join(tmpDir, 'A'), 'schema-A.json', schemaA);
        writeSchema(path.join(tmpDir, 'B'), 'schema-B.json', schemaB);

        await expect(validateSchemas(tmpDir)).rejects.toThrow('schema with key or id "duplicate-id" already exists');
    });
});
