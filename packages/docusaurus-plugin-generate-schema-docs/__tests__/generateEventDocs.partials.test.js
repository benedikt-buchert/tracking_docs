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

  function writeDuplicateNameOneOfSchemas() {
    const schemaA = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://example.com/schemas/duplicate-a.json',
      title: 'Duplicate A',
      oneOf: [
        {
          title: 'Shared Option',
          type: 'object',
          properties: {
            event: { type: 'string', const: 'dup_a' },
          },
          required: ['event'],
        },
      ],
    };
    const schemaB = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://example.com/schemas/duplicate-b.json',
      title: 'Duplicate B',
      oneOf: [
        {
          title: 'Shared Option',
          type: 'object',
          properties: {
            event: { type: 'string', const: 'dup_b' },
          },
          required: ['event'],
        },
      ],
    };

    fs.vol.writeFileSync(
      path.join(fixturesDir, 'static', 'schemas', 'duplicate-a.json'),
      JSON.stringify(schemaA, null, 2),
    );
    fs.vol.writeFileSync(
      path.join(fixturesDir, 'static', 'schemas', 'duplicate-b.json'),
      JSON.stringify(schemaB, null, 2),
    );
  }

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

  it('skips basename fallback partials when event names are ambiguous', async () => {
    console.log = jest.fn();
    writeDuplicateNameOneOfSchemas();
    fs.vol.mkdirSync(partialsDir, { recursive: true });
    fs.vol.writeFileSync(
      path.join(partialsDir, '_shared-option.mdx'),
      'Shared',
    );

    await generateEventDocs(options);

    const outputA = fs.readFileSync(
      path.join(outputDir, 'duplicate-a', '01-shared-option.mdx'),
      'utf-8',
    );
    const outputB = fs.readFileSync(
      path.join(outputDir, 'duplicate-b', '01-shared-option.mdx'),
      'utf-8',
    );

    expect(outputA).not.toContain('TopPartial');
    expect(outputB).not.toContain('TopPartial');
  });

  it('uses scoped partials for ambiguous event names', async () => {
    console.log = jest.fn();
    writeDuplicateNameOneOfSchemas();
    fs.vol.mkdirSync(path.join(partialsDir, 'duplicate-a'), {
      recursive: true,
    });
    fs.vol.writeFileSync(
      path.join(partialsDir, 'duplicate-a', '_shared-option.mdx'),
      'Scoped shared',
    );

    await generateEventDocs(options);

    const outputA = fs.readFileSync(
      path.join(outputDir, 'duplicate-a', '01-shared-option.mdx'),
      'utf-8',
    );
    const outputB = fs.readFileSync(
      path.join(outputDir, 'duplicate-b', '01-shared-option.mdx'),
      'utf-8',
    );

    expect(outputA).toContain(
      "import TopPartial from '@site/docs/partials/duplicate-a/_shared-option.mdx'",
    );
    expect(outputA).toContain('<TopPartial />');
    expect(outputB).not.toContain('TopPartial');
  });
});
