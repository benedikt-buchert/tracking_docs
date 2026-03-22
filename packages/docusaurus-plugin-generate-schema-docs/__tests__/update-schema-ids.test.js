/**
 * @jest-environment @stryker-mutator/jest-runner/jest-env/node
 */

import fs from 'fs';
import path from 'path';
import updateSchemaIds from '../helpers/update-schema-ids';

describe('updateSchemaIds', () => {
  const siteDir = path.resolve(__dirname, '__fixtures_versioned__');
  const url = 'https://tracking-docs-demo.buchert.digital/';

  // Create a temporary copy of the fixtures so we don't modify the originals
  const tempSiteDir = path.resolve(__dirname, '__temp_fixtures_versioned__');

  beforeEach(() => {
    fs.cpSync(siteDir, tempSiteDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempSiteDir, { recursive: true });
  });

  it('skips versions whose schema directory does not exist (L33)', () => {
    // Add a version that has no corresponding directory
    const versionsPath = path.join(tempSiteDir, 'versions.json');
    fs.writeFileSync(versionsPath, JSON.stringify(['1.1.1', '9.9.9']));

    // Should not throw; 9.9.9 directory doesn't exist and is skipped
    expect(() => updateSchemaIds(tempSiteDir, url)).not.toThrow();

    // The existing 1.1.1 schemas should still be updated
    const schemaPath = path.join(
      tempSiteDir,
      'static/schemas',
      '1.1.1',
      'add-to-cart-event.json',
    );
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    expect(schema.$id).toBe(
      'https://tracking-docs-demo.buchert.digital/schemas/1.1.1/add-to-cart-event.json',
    );
  });

  it('skips non-.json files in schema directories (L19)', () => {
    // Create a non-json file in the schema directory
    const nonJsonPath = path.join(
      tempSiteDir,
      'static/schemas',
      '1.1.1',
      'readme.txt',
    );
    fs.writeFileSync(nonJsonPath, 'This is not a JSON file');

    expect(() => updateSchemaIds(tempSiteDir, url)).not.toThrow();

    // The non-json file should remain unchanged
    const content = fs.readFileSync(nonJsonPath, 'utf8');
    expect(content).toBe('This is not a JSON file');
  });

  it('accepts a specific version parameter (L27-28)', () => {
    updateSchemaIds(tempSiteDir, url, '1.1.1');

    const schemaPath = path.join(
      tempSiteDir,
      'static/schemas',
      '1.1.1',
      'add-to-cart-event.json',
    );
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    expect(schema.$id).toBe(
      'https://tracking-docs-demo.buchert.digital/schemas/1.1.1/add-to-cart-event.json',
    );
  });

  it('returns early when versions.json does not exist (L6-8)', () => {
    const noVersionsDir = path.resolve(__dirname, '__temp_no_versions__');
    fs.mkdirSync(noVersionsDir, { recursive: true });

    try {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      updateSchemaIds(noVersionsDir, url);
      expect(consoleSpy).toHaveBeenCalledWith(
        'No versions.json file found, skipping schema ID update.',
      );
      consoleSpy.mockRestore();
    } finally {
      fs.rmSync(noVersionsDir, { recursive: true });
    }
  });

  it('should update the $id of the schemas in the versioned directories', () => {
    updateSchemaIds(tempSiteDir, url);

    const schemaPath = path.join(
      tempSiteDir,
      'static/schemas',
      '1.1.1',
      'add-to-cart-event.json',
    );
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

    expect(schema.$id).toBe(
      'https://tracking-docs-demo.buchert.digital/schemas/1.1.1/add-to-cart-event.json',
    );
  });
});
