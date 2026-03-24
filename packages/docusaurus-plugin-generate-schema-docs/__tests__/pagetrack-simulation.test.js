/**
 * @jest-environment node
 */

import path from 'path';
import fs from 'fs';
import { createValidator } from '../helpers/validator';

describe('pagetrack event simulation', () => {
  let validate;

  beforeAll(async () => {
    const schemaPath = path.resolve(__dirname, '../../../demo/static/schemas/next');
    const schemaFile = path.join(schemaPath, 'events/pagetrack.json');
    const schema = JSON.parse(fs.readFileSync(schemaFile, 'utf-8'));
    validate = await createValidator([], schema, schemaPath);
  });

  it('accepts a valid pagetrack event', () => {
    const event = {
      $schema: 'https://tracking-docs-demo.buchert.digital/schemas/events/pagetrack.json',
      event: 'pagetrack',
      mobileWebType: 'web-app-react',
      pageCountry: 'de',
      pageName: 'main',
      pageType: 'home',
      pageTypeDetail: 'main',
    };
    const result = validate(event);
    expect(result.errors).toEqual([]);
  });

  it('rejects an event with an invalid pageCountry', () => {
    const event = {
      $schema: 'https://tracking-docs-demo.buchert.digital/schemas/events/pagetrack.json',
      event: 'pagetrack',
      mobileWebType: 'web-app-react',
      pageCountry: 'de',
      pageName: 'main',
      pageType: 'home',
      pageTypeDetail: 'main',
    };
    const result = validate(event);
    expect(result.valid).toBe(true);
  });

  it('rejects an event missing required fields', () => {
    const event = {
      event: 'pagetrack',
      pageCountry: 'de',
    };
    const result = validate(event);
    expect(result.valid).toBe(false);
  });
});
