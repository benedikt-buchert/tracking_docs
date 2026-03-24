/**
 * @jest-environment @stryker-mutator/jest-runner/jest-env/node
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

  it('should return false and log errors when a schema produces no examples', async () => {
    const fixturePath = path.resolve(
      __dirname,
      '__fixtures__',
      'validateSchemas',
      'no-example-schema.json',
    );
    const schemaDir = path.join(tmpDir, 'schemas');
    fs.mkdirSync(schemaDir, { recursive: true });
    fs.copyFileSync(
      fixturePath,
      path.join(schemaDir, 'no-example-schema.json'),
    );

    const result = await validateSchemas(schemaDir);
    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
    const errorMessages = consoleErrorSpy.mock.calls
      .map((c) => c[0])
      .join('\n');
    expect(errorMessages).toContain('does not produce any examples');
  });

  it('should return false and log error when processing a schema throws', async () => {
    const fixturePath = path.resolve(
      __dirname,
      '__fixtures__',
      'validateSchemas',
      'main-schema-with-missing-ref.json',
    );
    const schemaDir = path.join(tmpDir, 'schemas');
    fs.mkdirSync(schemaDir, { recursive: true });
    fs.copyFileSync(
      fixturePath,
      path.join(schemaDir, 'main-schema-with-missing-ref.json'),
    );

    const result = await validateSchemas(schemaDir);
    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
    const errorMessages = consoleErrorSpy.mock.calls
      .map((c) => c[0])
      .join('\n');
    expect(errorMessages).toContain('Error processing');
  });

  it('should report errors for all failing schemas when multiple schemas exist', async () => {
    const schemaDir = path.join(tmpDir, 'schemas');
    fs.mkdirSync(schemaDir, { recursive: true });

    // First schema: valid
    fs.writeFileSync(
      path.join(schemaDir, 'valid.json'),
      JSON.stringify({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: { event: { type: 'string', const: 'ok' } },
        required: ['event'],
      }),
    );

    // Second schema: no examples produced
    fs.writeFileSync(
      path.join(schemaDir, 'no-examples.json'),
      JSON.stringify({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: { untyped: { description: 'no type or example' } },
        required: ['untyped'],
      }),
    );

    const result = await validateSchemas(schemaDir);
    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should return false when a oneOf option produces an undefined example', async () => {
    const schemaDir = path.join(tmpDir, 'schemas');
    fs.mkdirSync(schemaDir, { recursive: true });

    // Schema with a oneOf where one option has no resolvable example
    fs.writeFileSync(
      path.join(schemaDir, 'undef-option.json'),
      JSON.stringify({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        oneOf: [
          {
            title: 'ValidOption',
            properties: { event: { type: 'string', const: 'test' } },
            required: ['event'],
          },
          {
            title: 'UndefinedOption',
            properties: { mystery: { description: 'no type, no example' } },
            required: ['mystery'],
          },
        ],
      }),
    );

    const result = await validateSchemas(schemaDir);
    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
    const errorMessages = consoleErrorSpy.mock.calls
      .map((c) => c[0])
      .join('\n');
    expect(errorMessages).toContain('does not produce a valid example');
  });

  it('should report all examples invalid when every example fails validation', async () => {
    const schemaDir = path.join(tmpDir, 'schemas');
    fs.mkdirSync(schemaDir, { recursive: true });

    // Schema where every oneOf option produces an example that fails schema validation
    fs.writeFileSync(
      path.join(schemaDir, 'all-invalid.json'),
      JSON.stringify({
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          count: {
            type: 'integer',
            minimum: 100,
            example: 1,
          },
        },
        required: ['count'],
      }),
    );

    const result = await validateSchemas(schemaDir);
    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
    const errorMessages = consoleErrorSpy.mock.calls
      .map((c) => c[0])
      .join('\n');
    expect(errorMessages).toContain('example data failed validation');
  });
});
