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
  let consoleLogSpy;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-test-'));
  });

  afterEach(() => {
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
});
