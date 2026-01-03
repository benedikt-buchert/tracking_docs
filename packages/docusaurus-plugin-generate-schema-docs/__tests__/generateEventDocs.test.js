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

    beforeEach(() => {
        // Clear all instances and calls to constructor and all methods:
        fs.writeFileSync.mockClear();
        fs.mkdirSync.mockClear();
        fs.existsSync.mockClear();
    });

    it('should generate documentation for schemas and create output dir', async () => {
        console.log = jest.fn(); // suppress console.log
        fs.existsSync.mockReturnValue(false); // Simulate that the directory does not exist

        await generateEventDocs(options);

        // Expect mkdirSync to have been called to create the output directory
        expect(fs.mkdirSync).toHaveBeenCalledWith(outputDir, { recursive: true });

        // Expect writeFileSync to have been called once for each schema
        expect(fs.writeFileSync).toHaveBeenCalledTimes(1);

        // Check the content of the generated file
        const [filePath, content] = fs.writeFileSync.mock.calls[0];
        expect(filePath).toBe(path.join(outputDir, 'add-to-cart-event.mdx'));
        expect(content).toMatchSnapshot();
    });

    it('should not create output directory if it already exists', async () => {
        console.log = jest.fn(); // suppress console.log
        fs.existsSync.mockReturnValue(true); // Simulate that the directory exists

        await generateEventDocs(options);

        // Expect mkdirSync not to have been called
        expect(fs.mkdirSync).not.toHaveBeenCalled();

        // Still expect the file to be written
        expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    });
});