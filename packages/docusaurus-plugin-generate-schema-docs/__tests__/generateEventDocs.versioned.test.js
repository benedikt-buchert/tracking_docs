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
    // Mock fs.writeFileSync to capture the output
    fs.writeFileSync = jest.fn();

    const currentOptions = { ...options, version: 'current' };
    await generateEventDocs(currentOptions);

    expect(fs.writeFileSync).toHaveBeenCalled();
    const [filePath, content] = fs.writeFileSync.mock.calls[0];
    const outputDir = path.join(options.siteDir, 'docs');
    expect(filePath).toBe(path.join(outputDir, 'add-to-cart-event.mdx'));
    expect(content).toMatchSnapshot();
  });

  it('should generate documentation for a specific version', async () => {
    // Mock fs.writeFileSync to capture the output
    fs.writeFileSync = jest.fn();

    const versionedOptions = { ...options, version: '1.1.1' };
    await generateEventDocs(versionedOptions);

    expect(fs.writeFileSync).toHaveBeenCalled();
    const [filePath, content] = fs.writeFileSync.mock.calls[0];
    const outputDir = path.join(
      options.siteDir,
      'versioned_docs',
      'version-1.1.1',
    );
    expect(filePath).toBe(path.join(outputDir, 'add-to-cart-event.mdx'));
    expect(content).toMatchSnapshot();
  });
});
