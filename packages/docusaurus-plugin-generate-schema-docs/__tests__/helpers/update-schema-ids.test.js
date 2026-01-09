import { vol } from 'memfs';
import updateSchemaIds from '../../helpers/update-schema-ids';

// Mock the file system
jest.mock('fs', () => require('memfs').vol);

describe('updateSchemaIds', () => {
    const siteDir = '/test-site';
    const url = 'https://example.com';

    beforeEach(() => {
        vol.reset();
    });

    it('should recursively update schema IDs for all versions', () => {
        // Create a mock file system
        const versions = ['1.0.0', '2.0.0'];
        const schemaFiles = {
            'versions.json': JSON.stringify(versions),
            'static/schemas/1.0.0/main.json': JSON.stringify({ title: 'Main 1.0.0' }),
            'static/schemas/1.0.0/components/comp.json': JSON.stringify({ title: 'Comp 1.0.0' }),
            'static/schemas/2.0.0/main.json': JSON.stringify({ title: 'Main 2.0.0' }),
            'static/schemas/2.0.0/components/comp.json': JSON.stringify({ title: 'Comp 2.0.0' }),
        };
        vol.fromJSON(schemaFiles, siteDir);

        // Run the function
        updateSchemaIds(siteDir, url);

        // Check if the IDs were updated
        const schema1 = JSON.parse(vol.readFileSync(`${siteDir}/static/schemas/1.0.0/main.json`, 'utf-8'));
        expect(schema1.$id).toBe('https://example.com/schemas/1.0.0/main.json');

        const schema2 = JSON.parse(vol.readFileSync(`${siteDir}/static/schemas/1.0.0/components/comp.json`, 'utf-8'));
        expect(schema2.$id).toBe('https://example.com/schemas/1.0.0/components/comp.json');

        const schema3 = JSON.parse(vol.readFileSync(`${siteDir}/static/schemas/2.0.0/main.json`, 'utf-8'));
        expect(schema3.$id).toBe('https://example.com/schemas/2.0.0/main.json');

        const schema4 = JSON.parse(vol.readFileSync(`${siteDir}/static/schemas/2.0.0/components/comp.json`, 'utf-8'));
        expect(schema4.$id).toBe('https://example.com/schemas/2.0.0/components/comp.json');
    });

    it('should update schema IDs for a single version', () => {
        // Create a mock file system
        const versions = ['1.0.0', '2.0.0'];
        const schemaFiles = {
            'versions.json': JSON.stringify(versions),
            'static/schemas/1.0.0/main.json': JSON.stringify({ title: 'Main 1.0.0' }),
            'static/schemas/2.0.0/main.json': JSON.stringify({ title: 'Main 2.0.0' }),
        };
        vol.fromJSON(schemaFiles, siteDir);

        // Run the function for a single version
        updateSchemaIds(siteDir, url, '1.0.0');

        // Check if only the specified version was updated
        const schema1 = JSON.parse(vol.readFileSync(`${siteDir}/static/schemas/1.0.0/main.json`, 'utf-8'));
        expect(schema1.$id).toBe('https://example.com/schemas/1.0.0/main.json');

        const schema2 = JSON.parse(vol.readFileSync(`${siteDir}/static/schemas/2.0.0/main.json`, 'utf-8'));
        expect(schema2.$id).toBeUndefined();
    });

    it('should not do anything if versions.json does not exist', () => {
        // Create a mock file system without versions.json
        const schemaFiles = {
            'static/schemas/1.0.0/main.json': JSON.stringify({ title: 'Main 1.0.0' }),
        };
        vol.fromJSON(schemaFiles, siteDir);

        // Run the function
        updateSchemaIds(siteDir, url);

        // Check that no files were modified
        const schema1 = JSON.parse(vol.readFileSync(`${siteDir}/static/schemas/1.0.0/main.json`, 'utf-8'));
        expect(schema1.$id).toBeUndefined();
    });
});
