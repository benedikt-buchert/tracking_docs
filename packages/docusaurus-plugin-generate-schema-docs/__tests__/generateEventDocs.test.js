/**
 * @jest-environment node
 */

import generateEventDocs from '../generateEventDocs';
import fs from 'fs';
import path from 'path';

jest.mock('fs', () => {
    const originalFs = jest.requireActual('fs');
    return {
        ...originalFs,
        writeFileSync: jest.fn(),
        mkdirSync: jest.fn(),
        existsSync: jest.fn(),
        readdirSync: originalFs.readdirSync,
        readFileSync: originalFs.readFileSync,
    };
});

describe('generateEventDocs', () => {

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

    it('should generate documentation correctly when no partials exist', async () => {
        console.log = jest.fn(); // suppress console.log

        // Simulate that no partials exist
        fs.existsSync.mockReturnValue(false);

        await generateEventDocs(options);

        // Expect writeFileSync to have been called once for each schema
        expect(fs.writeFileSync).toHaveBeenCalledTimes(1);

        // Check the content of the generated file
        const [filePath, content] = fs.writeFileSync.mock.calls[0];
        expect(filePath).toBe(path.join(outputDir, 'add-to-cart-event.mdx'));
        expect(content).toMatchSnapshot();
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

        // Expect writeFileSync to have been called once for each schema
        expect(fs.writeFileSync).toHaveBeenCalledTimes(1);

        // Check the content of the generated file
        const [filePath, content] = fs.writeFileSync.mock.calls[0];
        expect(filePath).toBe(path.join(outputDir, 'add-to-cart-event.mdx'));
        expect(content).toMatchSnapshot();
    });
});
