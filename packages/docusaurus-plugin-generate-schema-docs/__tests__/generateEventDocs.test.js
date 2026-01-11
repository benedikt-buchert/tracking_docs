/**
 * @jest-environment node
 */

import generateEventDocs from '../generateEventDocs';
import fs from 'fs';
import path from 'path';

jest.mock('fs', () => {
    const originalFs = jest.requireActual('fs');
    const path = require('path');
    const schemaDir = path.resolve(__dirname, '__fixtures__/static/schemas');
    const files = originalFs.readdirSync(schemaDir);
    return {
        ...originalFs,
        writeFileSync: jest.fn(),
        mkdirSync: jest.fn(),
        existsSync: jest.fn(),
        readdirSync: jest.fn().mockReturnValue(files),
        readFileSync: originalFs.readFileSync,
    };
});

describe('generateEventDocs (non-versioned)', () => {

    const options = {
        organizationName: 'test-org',
        projectName: 'test-project',
        // Use the fixtures directory as the siteDir for tests
        siteDir: path.resolve(__dirname, '__fixtures__')
    }
    const outputDir = path.join(options.siteDir, 'docs/events');
    const partialsDir = path.join(options.siteDir, 'docs/partials');


    beforeEach(() => {
        // Clear all instances and calls to constructor and all methods:
        fs.writeFileSync.mockClear();
        fs.mkdirSync.mockClear();
        fs.existsSync.mockClear();
    });

    it('should generate documentation correctly', async () => {
        console.log = jest.fn(); // suppress console.log

        fs.existsSync.mockReturnValue(false);

        await generateEventDocs(options);

        expect(fs.writeFileSync).toHaveBeenCalledTimes(4);

        const writtenFiles = fs.writeFileSync.mock.calls.reduce((acc, call) => {
            acc[path.basename(call[0])] = call[1];
            return acc;
        }, {});

        expect(writtenFiles['add-to-cart-event.mdx']).toMatchSnapshot();
        expect(writtenFiles['choice-event.mdx']).toMatchSnapshot();
        expect(writtenFiles['root-choice-event.mdx']).toMatchSnapshot();
        expect(writtenFiles['root-any-of-event.mdx']).toMatchSnapshot();
    });

    it('should generate documentation with top and bottom partials when they exist', async () => {
        console.log = jest.fn(); // suppress console.log

        // Simulate that the output directory and partials exist
        fs.existsSync.mockImplementation((filePath) => {
            if (filePath === outputDir) {
                return true;
            }
            if (filePath === path.join(partialsDir, 'add-to-cart-event.mdx')) {
                return true;
            }
            if (filePath === path.join(partialsDir, 'add-to-cart-event_bottom.mdx')) {
                return true;
            }
            return false;
        });

        await generateEventDocs(options);

        // Expect writeFileSync to have been called for each schema
        expect(fs.writeFileSync).toHaveBeenCalledTimes(4);

        const writtenFiles = fs.writeFileSync.mock.calls.reduce((acc, call) => {
            acc[path.basename(call[0])] = call[1];
            return acc;
        }, {});

        expect(writtenFiles['add-to-cart-event.mdx']).toMatchSnapshot();
    });
});
