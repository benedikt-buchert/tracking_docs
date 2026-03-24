/**
 * @jest-environment @stryker-mutator/jest-runner/jest-env/node
 */

import generateEventDocs from '../generateEventDocs';
import fs from 'fs';
import path from 'path';

jest.mock('fs', () => {
  const memfs = require('memfs');
  return memfs;
});

describe('generateEventDocs (non-versioned)', () => {
  const options = {
    organizationName: 'test-org',
    projectName: 'test-project',
    // Use the fixtures directory as the siteDir for tests
    siteDir: path.resolve(__dirname, '__fixtures__'),
    url: 'https://tracking-docs-demo.buchert.digital',
  };
  const outputDir = path.join(options.siteDir, 'docs');

  beforeEach(() => {
    fs.vol.reset();
    const realFs = jest.requireActual('fs');
    const fixturesDir = path.resolve(__dirname, '__fixtures__');

    function readDirRecursive(dir) {
      const files = realFs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
          fs.vol.mkdirSync(filePath, { recursive: true });
          readDirRecursive(filePath);
        } else {
          const content = realFs.readFileSync(filePath);
          fs.vol.writeFileSync(filePath, content);
        }
      }
    }
    readDirRecursive(fixturesDir);
  });

  it('should generate documentation correctly', async () => {
    console.log = jest.fn(); // suppress console.log

    await generateEventDocs(options);

    const choiceEventDir = path.join(outputDir, 'root-choice-event');
    expect(fs.existsSync(choiceEventDir)).toBe(true);

    // Check content of generated files
    const addToCart = fs.readFileSync(
      path.join(outputDir, 'add-to-cart-event.mdx'),
      'utf-8',
    );
    expect(addToCart).toMatchSnapshot();
    expect(addToCart).toContain('sourcePath={"add-to-cart-event.json"}');
    expect(addToCart).toContain(JSON.stringify('components/product.json'));
    expect(addToCart).toContain('"$ref":"./components/product.json"');

    const choiceEvent = fs.readFileSync(
      path.join(outputDir, 'choice-event.mdx'),
      'utf-8',
    );
    expect(choiceEvent).toMatchSnapshot();

    const rootAnyOf = fs.readFileSync(
      path.join(outputDir, 'root-any-of-event.mdx'),
      'utf-8',
    );
    expect(rootAnyOf).toMatchSnapshot();

    const rootChoiceIndex = fs.readFileSync(
      path.join(choiceEventDir, 'index.mdx'),
      'utf-8',
    );
    expect(rootChoiceIndex).toMatchSnapshot();

    const rootChoiceA = fs.readFileSync(
      path.join(choiceEventDir, '01-option-a.mdx'),
      'utf-8',
    );
    expect(rootChoiceA).toMatchSnapshot();
    // Inline oneOf options must link to the parent schema file, not a temp output file
    expect(rootChoiceA).toContain(
      'custom_edit_url: https://github.com/test-org/test-project/edit/main/__fixtures__/static/schemas/root-choice-event.json',
    );

    const rootChoiceB = fs.readFileSync(
      path.join(choiceEventDir, '02-option-b.mdx'),
      'utf-8',
    );
    expect(rootChoiceB).toMatchSnapshot();
    expect(rootChoiceB).toContain(
      'custom_edit_url: https://github.com/test-org/test-project/edit/main/__fixtures__/static/schemas/root-choice-event.json',
    );
  });
});

describe('generateEventDocs (edge cases)', () => {
  beforeEach(() => {
    fs.vol.reset();
    console.log = jest.fn();
  });

  it('handles being called with no arguments', async () => {
    // Covers L284: options || {}
    // getPathsForVersion(undefined, undefined) will produce a path that won't exist
    await expect(generateEventDocs()).rejects.toThrow();
  });

  it('handles being called with null options', async () => {
    // Covers L284: options || {}
    await expect(generateEventDocs(null)).rejects.toThrow();
  });

  it('sets $id with non-trailing-slash URL for versioned schemas', async () => {
    // Covers L298: url without trailing slash (no slice needed)
    const realFs = jest.requireActual('fs');
    const versionedFixturesDir = path.resolve(
      __dirname,
      '__fixtures_versioned__',
    );

    function readDirRecursive(dir) {
      const entries = realFs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          fs.vol.mkdirSync(entryPath, { recursive: true });
          readDirRecursive(entryPath);
        } else {
          fs.vol.writeFileSync(entryPath, realFs.readFileSync(entryPath));
        }
      }
    }
    readDirRecursive(versionedFixturesDir);

    const versionedOptions = {
      organizationName: 'test-org',
      projectName: 'test-project',
      siteDir: versionedFixturesDir,
      url: 'https://tracking-docs-demo.buchert.digital',
      version: '1.1.1',
    };

    await generateEventDocs(versionedOptions);

    const versionedOutputDir = path.join(
      versionedFixturesDir,
      'versioned_docs',
      'version-1.1.1',
    );
    const content = fs.readFileSync(
      path.join(versionedOutputDir, 'add-to-cart-event.mdx'),
      'utf-8',
    );
    // URL had no trailing slash, so no slice applied; $id should still be set correctly
    expect(content).toContain(
      'https://tracking-docs-demo.buchert.digital/schemas/1.1.1/add-to-cart-event.json',
    );
  });

  it('sets $id with next for current version', async () => {
    const realFs = jest.requireActual('fs');
    const versionedFixturesDir = path.resolve(
      __dirname,
      '__fixtures_versioned__',
    );

    function readDirRecursive(dir) {
      const entries = realFs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          fs.vol.mkdirSync(entryPath, { recursive: true });
          readDirRecursive(entryPath);
        } else {
          fs.vol.writeFileSync(entryPath, realFs.readFileSync(entryPath));
        }
      }
    }
    readDirRecursive(versionedFixturesDir);

    const currentOptions = {
      organizationName: 'test-org',
      projectName: 'test-project',
      siteDir: versionedFixturesDir,
      url: 'https://tracking-docs-demo.buchert.digital',
      version: 'current',
    };

    await generateEventDocs(currentOptions);

    const currentOutputDir = path.join(versionedFixturesDir, 'docs');
    const content = fs.readFileSync(
      path.join(currentOutputDir, 'add-to-cart-event.mdx'),
      'utf-8',
    );
    expect(content).toContain(
      'https://tracking-docs-demo.buchert.digital/schemas/next/add-to-cart-event.json',
    );
  });

  it('handles schemas with $ref pointing outside schema directory', async () => {
    // Covers L72 (walkSchema with currentPath not in allSchemaSources)
    // The component references a file outside the schema dir via ../
    // which resolves to a key not present in schemaSources
    const testSiteDir = path.resolve(__dirname, '__fixtures_outside_ref__');
    const schemaDir = path.join(testSiteDir, 'static/schemas');
    const componentsDir = path.join(schemaDir, 'components');
    const outsideDir = path.join(testSiteDir, 'static');
    fs.vol.mkdirSync(componentsDir, { recursive: true });

    // A shared schema placed outside the schemas directory
    const sharedSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://example.com/shared.json',
      title: 'Shared',
      type: 'object',
      properties: {
        shared_prop: { type: 'string' },
      },
    };
    fs.vol.writeFileSync(
      path.join(outsideDir, 'shared.json'),
      JSON.stringify(sharedSchema, null, 2),
    );

    // A component that references the shared schema outside the schema dir
    const componentSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://example.com/schemas/components/widget.json',
      title: 'Widget',
      type: 'object',
      properties: {
        name: { type: 'string' },
        base: { $ref: '../../shared.json' },
      },
    };
    fs.vol.writeFileSync(
      path.join(componentsDir, 'widget.json'),
      JSON.stringify(componentSchema, null, 2),
    );

    // Main schema referencing the component
    const mainSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://example.com/schemas/outside-ref.json',
      title: 'Outside Ref Event',
      type: 'object',
      properties: {
        event: { type: 'string', const: 'outside_ref' },
        widget: { $ref: './components/widget.json' },
      },
    };
    fs.vol.writeFileSync(
      path.join(schemaDir, 'outside-ref.json'),
      JSON.stringify(mainSchema, null, 2),
    );

    const outsideRefOptions = {
      organizationName: 'test-org',
      projectName: 'test-project',
      siteDir: testSiteDir,
      url: 'https://example.com',
    };

    await generateEventDocs(outsideRefOptions);

    const outputDir = path.join(testSiteDir, 'docs');
    expect(fs.existsSync(path.join(outputDir, 'outside-ref.mdx'))).toBe(true);
  });

  it('handles schemas with circular $ref between source files', async () => {
    // Covers L72 (walkSchema with visited path - circular reference)
    const testSiteDir = path.resolve(__dirname, '__fixtures_circular_ref__');
    const schemaDir = path.join(testSiteDir, 'static/schemas');
    const componentsDir = path.join(schemaDir, 'components');
    fs.vol.mkdirSync(componentsDir, { recursive: true });

    const mainSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://example.com/schemas/circular.json',
      title: 'Circular Ref Event',
      type: 'object',
      properties: {
        event: { type: 'string', const: 'circular' },
        node: { $ref: './components/node.json' },
      },
    };

    const nodeSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://example.com/schemas/components/node.json',
      title: 'Node',
      type: 'object',
      properties: {
        value: { type: 'string' },
        parent: { $ref: '../circular.json' },
      },
    };

    fs.vol.writeFileSync(
      path.join(schemaDir, 'circular.json'),
      JSON.stringify(mainSchema, null, 2),
    );
    fs.vol.writeFileSync(
      path.join(componentsDir, 'node.json'),
      JSON.stringify(nodeSchema, null, 2),
    );

    const circularOptions = {
      organizationName: 'test-org',
      projectName: 'test-project',
      siteDir: testSiteDir,
      url: 'https://example.com',
    };

    await generateEventDocs(circularOptions);

    const outputDir = path.join(testSiteDir, 'docs');
    expect(fs.existsSync(path.join(outputDir, 'circular.mdx'))).toBe(true);
  });

  it('covers collectLeafEventNames for non-oneOf schemas via nested oneOf', async () => {
    // Covers L104-106: collectLeafEventNames with schema that has no oneOf
    // This requires a nested oneOf where processOneOfSchema returns a schema
    // that itself has oneOf, so collectLeafEventNames recurses
    const testSiteDir = path.resolve(__dirname, '__fixtures_nested_leaf__');
    const schemaDir = path.join(testSiteDir, 'static/schemas');
    fs.vol.mkdirSync(schemaDir, { recursive: true });

    const realFs = jest.requireActual('fs');

    // Copy the nested fixture files
    const nestedSchemasDir = path.resolve(
      __dirname,
      '__fixtures__/static/schemas/nested',
    );
    const files = realFs.readdirSync(nestedSchemasDir);
    for (const file of files) {
      const content = realFs.readFileSync(path.join(nestedSchemasDir, file));
      fs.vol.writeFileSync(path.join(schemaDir, file), content);
    }

    const nestedLeafOptions = {
      organizationName: 'test-org',
      projectName: 'test-project',
      siteDir: testSiteDir,
      url: 'https://example.com',
    };

    await generateEventDocs(nestedLeafOptions);

    const outputDir = path.join(testSiteDir, 'docs');
    const parentDir = path.join(outputDir, 'parent-event');
    expect(fs.existsSync(parentDir)).toBe(true);
  });

  it('uses fallback partial for oneOf sub-option when scoped partial does not exist', async () => {
    // Covers L34 (cond-expr): fallback partial path is selected when
    // the scoped partial does not exist but the basename fallback does
    const testSiteDir = path.resolve(
      __dirname,
      '__fixtures_fallback_partial__',
    );
    const schemaDir = path.join(testSiteDir, 'static/schemas');
    const outputDir = path.join(testSiteDir, 'docs');
    const partialsDir = path.join(outputDir, 'partials');
    fs.vol.mkdirSync(schemaDir, { recursive: true });
    fs.vol.mkdirSync(partialsDir, { recursive: true });

    const schema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://example.com/schemas/parent-fb.json',
      title: 'Parent FB',
      oneOf: [
        {
          title: 'Child Alpha',
          type: 'object',
          properties: {
            event: { type: 'string', const: 'child_alpha' },
          },
          required: ['event'],
        },
      ],
    };
    fs.vol.writeFileSync(
      path.join(schemaDir, 'parent-fb.json'),
      JSON.stringify(schema, null, 2),
    );

    // Create a fallback partial in base partials dir (not in the scoped subdir)
    // The scoped path would be partials/parent-fb/_child-alpha.mdx which does not exist
    // The fallback path is partials/_child-alpha.mdx which we create here
    fs.vol.writeFileSync(
      path.join(partialsDir, '_child-alpha.mdx'),
      '## Fallback partial content',
    );

    const fbOptions = {
      organizationName: 'test-org',
      projectName: 'test-project',
      siteDir: testSiteDir,
      url: 'https://example.com',
    };

    await generateEventDocs(fbOptions);

    const choiceOutput = fs.readFileSync(
      path.join(outputDir, 'parent-fb', '01-child-alpha.mdx'),
      'utf-8',
    );
    // The fallback partial should be used since the scoped one doesn't exist
    expect(choiceOutput).toContain(
      "import TopPartial from '@site/docs/partials/_child-alpha.mdx'",
    );
    expect(choiceOutput).toContain('<TopPartial />');
  });

  it('removes stale oneOf output files and directories between runs', async () => {
    const testSiteDir = path.resolve(
      __dirname,
      '__fixtures_stale_oneof_cleanup__',
    );
    const schemaDir = path.join(testSiteDir, 'static/schemas');
    const docsDir = path.join(testSiteDir, 'docs');
    fs.vol.mkdirSync(schemaDir, { recursive: true });

    const schemaFile = path.join(schemaDir, 'stale-choice.json');
    const cleanupOptions = {
      organizationName: 'test-org',
      projectName: 'test-project',
      siteDir: testSiteDir,
      url: 'https://example.com',
    };

    const initialSchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://example.com/schemas/stale-choice.json',
      title: 'Stale Choice',
      oneOf: [
        {
          title: 'Leaf A',
          type: 'object',
          properties: {
            event: { type: 'string', const: 'leaf_a' },
          },
        },
        {
          title: 'Group B',
          oneOf: [
            {
              title: 'Leaf B',
              type: 'object',
              properties: {
                event: { type: 'string', const: 'leaf_b' },
              },
            },
          ],
        },
      ],
    };

    fs.vol.writeFileSync(schemaFile, JSON.stringify(initialSchema, null, 2));
    await generateEventDocs(cleanupOptions);

    expect(
      fs.existsSync(path.join(docsDir, 'stale-choice', '01-leaf-a.mdx')),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(docsDir, 'stale-choice', '02-group-b')),
    ).toBe(true);

    const updatedSchema = {
      ...initialSchema,
      oneOf: [initialSchema.oneOf[0]],
    };

    fs.vol.writeFileSync(schemaFile, JSON.stringify(updatedSchema, null, 2));

    const unlinkSpy = jest.spyOn(fs, 'unlinkSync');
    const rmSpy = jest.spyOn(fs, 'rmSync');

    await generateEventDocs(cleanupOptions);

    expect(
      fs.existsSync(path.join(docsDir, 'stale-choice', '01-leaf-a.mdx')),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(docsDir, 'stale-choice', '02-group-b')),
    ).toBe(false);
    expect(unlinkSpy).not.toHaveBeenCalledWith(
      path.join(docsDir, 'stale-choice', '01-leaf-a.mdx'),
    );
    expect(rmSpy).toHaveBeenCalledWith(
      path.join(docsDir, 'stale-choice', '02-group-b'),
      { recursive: true },
    );
  });

  it('generates docs for inline nested oneOf schemas', async () => {
    // Covers L259 (sourceFilePath || filePath fallback in generateOneOfDocs)
    // and L114 (sourceFilePath || filePath fallback in collectLeafEventNames)
    // and L105-106 (collectLeafEventNames for non-oneOf leaf via recursion)
    const testSiteDir = path.resolve(
      __dirname,
      '__fixtures_inline_nested_oneof__',
    );
    const schemaDir = path.join(testSiteDir, 'static/schemas');
    fs.vol.mkdirSync(schemaDir, { recursive: true });

    // A schema with inline nested oneOf (no $ref, so sourceFilePath is null)
    const schema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://example.com/schemas/inline-nested.json',
      title: 'Inline Nested',
      oneOf: [
        {
          title: 'Group One',
          oneOf: [
            {
              title: 'Leaf A',
              type: 'object',
              properties: {
                event: { type: 'string', const: 'leaf_a' },
              },
            },
            {
              title: 'Leaf B',
              type: 'object',
              properties: {
                event: { type: 'string', const: 'leaf_b' },
              },
            },
          ],
        },
      ],
    };

    fs.vol.writeFileSync(
      path.join(schemaDir, 'inline-nested.json'),
      JSON.stringify(schema, null, 2),
    );

    const inlineOptions = {
      organizationName: 'test-org',
      projectName: 'test-project',
      siteDir: testSiteDir,
      url: 'https://example.com',
    };

    await generateEventDocs(inlineOptions);

    const outputDir = path.join(testSiteDir, 'docs');
    const parentDir = path.join(outputDir, 'inline-nested');
    expect(fs.existsSync(parentDir)).toBe(true);

    // The nested oneOf should create a subdirectory with index and leaf docs
    const nestedDir = path.join(parentDir, '01-group-one');
    expect(fs.existsSync(nestedDir)).toBe(true);
    expect(fs.existsSync(path.join(nestedDir, 'index.mdx'))).toBe(true);
    expect(fs.existsSync(path.join(nestedDir, '01-leaf-a.mdx'))).toBe(true);
    expect(fs.existsSync(path.join(nestedDir, '02-leaf-b.mdx'))).toBe(true);
  });

  it('handles collectReachableSchemaSources with empty sourcePath', async () => {
    // Covers L66: collectReachableSchemaSources early return when sourcePath is not in schemaSources
    // We create a schema with only local $ref (#) so the sourceKey for the
    // oneOf sub-option maps to a synthetic filename not present in schemaSources
    const testSiteDir = path.resolve(__dirname, '__fixtures_empty_source__');
    const schemaDir = path.join(testSiteDir, 'static/schemas');
    fs.vol.mkdirSync(schemaDir, { recursive: true });

    // A minimal schema with no external refs
    const schema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'https://example.com/schemas/simple.json',
      title: 'Simple Event',
      type: 'object',
      properties: {
        event: { type: 'string', const: 'simple' },
      },
    };
    fs.vol.writeFileSync(
      path.join(schemaDir, 'simple.json'),
      JSON.stringify(schema, null, 2),
    );

    const simpleOptions = {
      organizationName: 'test-org',
      projectName: 'test-project',
      siteDir: testSiteDir,
      url: 'https://example.com',
    };

    await generateEventDocs(simpleOptions);

    const outputDir = path.join(testSiteDir, 'docs');
    expect(fs.existsSync(path.join(outputDir, 'simple.mdx'))).toBe(true);
  });
});
