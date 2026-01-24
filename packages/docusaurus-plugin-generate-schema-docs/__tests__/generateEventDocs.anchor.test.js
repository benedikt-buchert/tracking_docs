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

describe('generateEventDocs (oneOf with $anchor)', () => {
  const testSiteDir = path.resolve(__dirname, '__fixtures_anchor__');
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
    const anchorSchemasDir = path.resolve(
      __dirname,
      '__fixtures__/static/schemas/anchor',
    );
    const targetSchemasDir = path.join(testSiteDir, 'static/schemas');
    fs.vol.mkdirSync(targetSchemasDir, { recursive: true });

    const files = realFs.readdirSync(anchorSchemasDir, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(anchorSchemasDir, file.name);
      const content = realFs.readFileSync(filePath);
      fs.vol.writeFileSync(path.join(targetSchemasDir, file.name), content);
    }
  });

  it('should generate documentation using $anchor for slug', async () => {
    console.log = jest.fn(); // suppress console.log

    await generateEventDocs(options);

    const parentDir = path.join(baseOutputDir, 'parent-event-anchor');

    // Check for directory structure
    expect(fs.existsSync(parentDir)).toBe(true);

    const parentIndex = fs.readFileSync(
      path.join(parentDir, 'index.mdx'),
      'utf-8',
    );
    expect(parentIndex).toMatchSnapshot();

    // Check content of generated files
    const childWithAnchor = fs.readFileSync(
      path.join(parentDir, '01-child-event-with-anchor.mdx'),
      'utf-8',
    );
    expect(childWithAnchor).toMatchSnapshot();

    const childWithTitle = fs.readFileSync(
      path.join(parentDir, '02-child-event-title.mdx'),
      'utf-8',
    );
    expect(childWithTitle).toMatchSnapshot();
  });
});
