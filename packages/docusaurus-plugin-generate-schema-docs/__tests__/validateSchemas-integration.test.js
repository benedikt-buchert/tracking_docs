/**
 * @jest-environment node
 */

import path from 'path';
import validateSchemas from '../validateSchemas';
import { getPathsForVersion } from '../helpers/path-helpers';

describe('validateSchemas - Integration', () => {
  let consoleErrorSpy;
  let consoleLogSpy;

  beforeEach(() => {
    // Spy on console.error and console.log to keep test output clean
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return true for the "next" version schemas', async () => {
    const siteDir = path.resolve(__dirname, '../../../demo');
    const { schemaDir } = getPathsForVersion('next', siteDir);
    const result = await validateSchemas(schemaDir);
    expect(result).toBe(true);
  });
});
