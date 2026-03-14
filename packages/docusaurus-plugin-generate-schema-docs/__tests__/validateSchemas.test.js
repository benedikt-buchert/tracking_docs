/**
 * @jest-environment node
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import validateSchemas from '../validateSchemas';

describe('validateSchemas', () => {
  let tmpDir;
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-test-'));
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should return true for a complex set of valid schemas', async () => {
    const fixtureDir = path.resolve(
      __dirname,
      '__fixtures__',
      'validateSchemas',
      'complex-validation',
    );
    const schemaDir = path.join(tmpDir, 'schemas');
    fs.mkdirSync(schemaDir, { recursive: true });
    fs.cpSync(fixtureDir, schemaDir, { recursive: true });
    const result = await validateSchemas(schemaDir);
    expect(result).toBe(true);
  });

  it('should return false if an example fails validation', async () => {
    const fixturePath = path.resolve(
      __dirname,
      '__fixtures__',
      'validateSchemas',
      'invalid-example-schema.json',
    );
    const schemaDir = path.join(tmpDir, 'schemas');
    fs.mkdirSync(schemaDir, { recursive: true });
    fs.copyFileSync(
      fixturePath,
      path.join(schemaDir, 'invalid-example-schema.json'),
    );
    const result = await validateSchemas(schemaDir);
    expect(result).toBe(false);
  });

  it('should warn and fallback to default target when x-tracking-targets is missing', async () => {
    const schemaDir = path.join(tmpDir, 'schemas');
    fs.mkdirSync(schemaDir, { recursive: true });
    fs.writeFileSync(
      path.join(schemaDir, 'event.json'),
      JSON.stringify({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          event: {
            type: 'string',
            const: 'test_event',
          },
        },
        required: ['event'],
      }),
    );

    const result = await validateSchemas(schemaDir);
    expect(result).toBe(true);
    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(consoleWarnSpy.mock.calls[0][0]).toContain('web-datalayer-js');
  });

  it('should fail when x-tracking-targets has an unsupported target', async () => {
    const schemaDir = path.join(tmpDir, 'schemas');
    fs.mkdirSync(schemaDir, { recursive: true });
    fs.writeFileSync(
      path.join(schemaDir, 'event.json'),
      JSON.stringify({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        'x-tracking-targets': ['web-not-supported-js'],
        properties: {
          event: {
            type: 'string',
            const: 'test_event',
          },
        },
        required: ['event'],
      }),
    );

    const result = await validateSchemas(schemaDir);
    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(consoleErrorSpy.mock.calls[0][0]).toContain('x-tracking-targets');
  });

  it('should treat falsy scalar examples as valid examples', async () => {
    const schemaDir = path.join(tmpDir, 'schemas');
    fs.mkdirSync(schemaDir, { recursive: true });
    fs.writeFileSync(
      path.join(schemaDir, 'event.json'),
      JSON.stringify({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          event: {
            type: 'string',
            const: 'test_event',
          },
          is_enabled: {
            type: 'boolean',
            example: false,
          },
          retry_count: {
            type: 'integer',
            example: 0,
          },
          note: {
            type: 'string',
            example: '',
          },
        },
        required: ['event', 'is_enabled', 'retry_count', 'note'],
      }),
    );

    const result = await validateSchemas(schemaDir);
    expect(result).toBe(true);
  });

  it('should allow a top-level falsy example value', async () => {
    const schemaDir = path.join(tmpDir, 'schemas');
    fs.mkdirSync(schemaDir, { recursive: true });
    fs.writeFileSync(
      path.join(schemaDir, 'flag.json'),
      JSON.stringify({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'boolean',
        example: false,
      }),
    );

    const result = await validateSchemas(schemaDir);
    expect(result).toBe(true);
  });
});
