/**
 * @jest-environment node
 */

import generateEventDocs from '../generateEventDocs';
import fs from 'fs';
import path from 'path';

jest.mock('fs', () => {
  const memfs = require('memfs');
  return memfs;
});

describe('generateEventDocs (nested oneOf)', () => {
  const testSiteDir = path.resolve(__dirname, '__fixtures_nested__');
  const options = {
    organizationName: 'test-org',
    projectName: 'test-project',
    siteDir: testSiteDir,
    url: 'https://tracking-docs-demo.buchert.digital',
  };
  const baseOutputDir = path.join(options.siteDir, 'docs');

  beforeEach(() => {
    fs.vol.reset();
    const realFs = jest.requireActual('fs');
    const nestedSchemasDir = path.resolve(
      __dirname,
      '__fixtures__/static/schemas/nested',
    );
    const targetSchemasDir = path.join(testSiteDir, 'static/schemas');
    fs.vol.mkdirSync(targetSchemasDir, { recursive: true });

    const files = realFs.readdirSync(nestedSchemasDir, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(nestedSchemasDir, file.name);
      const content = realFs.readFileSync(filePath);
      fs.vol.writeFileSync(path.join(targetSchemasDir, file.name), content);
    }
  });

  it('should generate nested documentation correctly', async () => {
    console.log = jest.fn(); // suppress console.log

    await generateEventDocs(options);

    const parentDir = path.join(baseOutputDir, 'parent-event');
    // The child directory is prefixed because it's an item in the parent's oneOf
    const childDir = path.join(parentDir, '01-child-event');

    // Check for directory structure
    expect(fs.existsSync(parentDir)).toBe(true);
    expect(fs.existsSync(childDir)).toBe(true);

    const parentIndex = fs.readFileSync(
      path.join(parentDir, 'index.mdx'),
      'utf-8',
    );
    expect(parentIndex).toMatchSnapshot();

    const childIndex = fs.readFileSync(
      path.join(childDir, 'index.mdx'),
      'utf-8',
    );
    expect(childIndex).toMatchSnapshot();

    // Check content of generated files
    const grandchildA = fs.readFileSync(
      path.join(childDir, '01-grandchild-a.mdx'),
      'utf-8',
    );
    expect(grandchildA).toMatchSnapshot();

    const grandchildB = fs.readFileSync(
      path.join(childDir, '02-grandchild-b.mdx'),
      'utf-8',
    );
    expect(grandchildB).toMatchSnapshot();
  });
});
