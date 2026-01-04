/**
 * @jest-environment node
 */

import path from 'path';
import loadSchema from '../../helpers/loadSchema';

describe('loadSchema', () => {
    it('should load and parse a JSON file', () => {
        const filePath = path.join(__dirname, '..', '__fixtures__', 'validateSchemas', 'circular-schema.json');
        const schema = loadSchema(filePath);
        expect(schema.title).toBe('Circular Schema');
    });
});
