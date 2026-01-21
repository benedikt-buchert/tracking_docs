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

describe('generateEventDocs (versioned)', () => {
  const options = {
    organizationName: 'test-org',
    projectName: 'test-project',
    url: 'https://tracking-docs-demo.buchert.digital/',
    // Use the fixtures_versioned directory as the siteDir for tests
    siteDir: path.resolve(__dirname, '__fixtures_versioned__'),
  };
  const partialsDir = path.join(options.siteDir, 'docs/partials');

  beforeEach(() => {
    // Clear all instances and calls to constructor and all methods:
    fs.writeFileSync.mockClear();
    fs.mkdirSync.mockClear();
    fs.existsSync.mockClear();
  });

  it('should generate documentation for "current" version', async () => {
    console.log = jest.fn(); // suppress console.log
    fs.existsSync.mockReturnValue(false);

    await generateEventDocs({ ...options, version: 'current' });

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);

    const [filePath, content] = fs.writeFileSync.mock.calls[0];
    const outputDir = path.join(options.siteDir, 'docs/events');
    expect(filePath).toBe(path.join(outputDir, 'add-to-cart-event.mdx'));
    expect(content).toMatchSnapshot();
  });

  it('should generate documentation for a specific version', async () => {
    console.log = jest.fn(); // suppress console.log
    fs.existsSync.mockReturnValue(false);

    await generateEventDocs({ ...options, version: '1.1.1' });

    expect(fs.writeFileSync).toHaveBeenCalledTimes(1);

    const [filePath, content] = fs.writeFileSync.mock.calls[0];
    const outputDir = path.join(
      options.siteDir,
      'versioned_docs',
      'version-1.1.1',
      'events',
    );
    expect(filePath).toBe(path.join(outputDir, 'add-to-cart-event.mdx'));
    expect(content).toMatchSnapshot();
  });
});
