/**
 * @jest-environment node
 *
 * Tests that top and bottom partials are correctly injected into generated MDX
 * when matching partial files exist in the partials directory, and that the
 * generated import paths use the event name (not the component prefix).
 */

import generateEventDocs from '../generateEventDocs';
import fs from 'fs';
import path from 'path';

jest.mock('fs', () => {
  const memfs = require('memfs');
  return memfs;
});

describe('generateEventDocs (partials)', () => {
  const fixturesDir = path.resolve(__dirname, '__fixtures__');
  const options = {
    organizationName: 'test-org',
    projectName: 'test-project',
    siteDir: fixturesDir,
    url: 'https://tracking-docs-demo.buchert.digital',
  };
  const outputDir = path.join(fixturesDir, 'docs');
  const partialsDir = path.join(outputDir, 'partials');

  beforeEach(() => {
    fs.vol.reset();
    const realFs = jest.requireActual('fs');

    function readDirRecursive(dir) {
      const files = realFs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
          fs.vol.mkdirSync(filePath, { recursive: true });
          readDirRecursive(filePath);
        } else {
          fs.vol.writeFileSync(filePath, realFs.readFileSync(filePath));
        }
      }
    }
    readDirRecursive(fixturesDir);
  });

  it('injects top partial when _<eventName>.mdx exists in partials dir', async () => {
    console.log = jest.fn();
    fs.vol.mkdirSync(partialsDir, { recursive: true });
    fs.vol.writeFileSync(
      path.join(partialsDir, '_add-to-cart-event.mdx'),
      '## Top content',
    );

    await generateEventDocs(options);

    const output = fs.readFileSync(
      path.join(outputDir, 'add-to-cart-event.mdx'),
      'utf-8',
    );

    expect(output).toContain(
      "import TopPartial from '@site/docs/partials/_add-to-cart-event.mdx'",
    );
    expect(output).toContain('<TopPartial />');
    expect(output).not.toContain('_Top.mdx');
  });

  it('injects bottom partial when _<eventName>_bottom.mdx exists in partials dir', async () => {
    console.log = jest.fn();
    fs.vol.mkdirSync(partialsDir, { recursive: true });
    fs.vol.writeFileSync(
      path.join(partialsDir, '_add-to-cart-event_bottom.mdx'),
      '## Bottom content',
    );

    await generateEventDocs(options);

    const output = fs.readFileSync(
      path.join(outputDir, 'add-to-cart-event.mdx'),
      'utf-8',
    );

    expect(output).toContain(
      "import BottomPartial from '@site/docs/partials/_add-to-cart-event_bottom.mdx'",
    );
    expect(output).toContain('<BottomPartial />');
    expect(output).not.toContain('_Bottom.mdx');
  });

  it('injects both top and bottom partials when both exist', async () => {
    console.log = jest.fn();
    fs.vol.mkdirSync(partialsDir, { recursive: true });
    fs.vol.writeFileSync(
      path.join(partialsDir, '_add-to-cart-event.mdx'),
      '## Top content',
    );
    fs.vol.writeFileSync(
      path.join(partialsDir, '_add-to-cart-event_bottom.mdx'),
      '## Bottom content',
    );

    await generateEventDocs(options);

    const output = fs.readFileSync(
      path.join(outputDir, 'add-to-cart-event.mdx'),
      'utf-8',
    );

    expect(output).toContain(
      "import TopPartial from '@site/docs/partials/_add-to-cart-event.mdx'",
    );
    expect(output).toContain('<TopPartial />');
    expect(output).toContain(
      "import BottomPartial from '@site/docs/partials/_add-to-cart-event_bottom.mdx'",
    );
    expect(output).toContain('<BottomPartial />');
  });

  it('omits partial imports when no partial files exist', async () => {
    console.log = jest.fn();

    await generateEventDocs(options);

    const output = fs.readFileSync(
      path.join(outputDir, 'add-to-cart-event.mdx'),
      'utf-8',
    );

    expect(output).not.toContain('TopPartial');
    expect(output).not.toContain('BottomPartial');
  });
});
