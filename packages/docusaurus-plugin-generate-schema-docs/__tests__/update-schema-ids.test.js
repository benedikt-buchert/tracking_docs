/**
 * @jest-environment node
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
