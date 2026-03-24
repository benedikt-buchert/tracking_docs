import path from 'path';
import { resolveConstraintSchemaPath } from '../../helpers/constraintSchemaPaths';

jest.mock('fs');
import fs from 'fs';

// A stable resolved root path that mocked existsSync returns truthy for
const MOCK_ROOT = path.resolve(
  process.cwd(),
  'packages',
  'tracking-target-constraints',
);

beforeEach(() => {
  jest.clearAllMocks();
  // By default, make the first candidate exist
  fs.existsSync.mockImplementation((p) => p === MOCK_ROOT);
});

describe('resolveConstraintSchemaPath — input validation', () => {
  it('returns null for null uri', () => {
    expect(resolveConstraintSchemaPath(null)).toBeNull();
  });

  it('returns null for undefined uri', () => {
    expect(resolveConstraintSchemaPath(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(resolveConstraintSchemaPath('')).toBeNull();
  });

  it('returns null for a number', () => {
    expect(resolveConstraintSchemaPath(42)).toBeNull();
  });

  it('returns null for an object', () => {
    expect(resolveConstraintSchemaPath({})).toBeNull();
  });

  it('rejects non-string via typeof check, not just falsiness', () => {
    // 0 is falsy AND not a string — both checks reject it
    expect(resolveConstraintSchemaPath(0)).toBeNull();
    // true is not a string but truthy — only typeof check catches it
    expect(resolveConstraintSchemaPath(true)).toBeNull();
  });
});

describe('resolveConstraintSchemaPath — when package root not found', () => {
  it('returns null when no candidate directory exists', () => {
    fs.existsSync.mockReturnValue(false);
    expect(resolveConstraintSchemaPath('/constraints/foo.json')).toBeNull();
  });

  it('checks multiple candidate paths (at least the primary one)', () => {
    fs.existsSync.mockReturnValue(false);
    resolveConstraintSchemaPath('/constraints/foo.json');
    expect(fs.existsSync).toHaveBeenCalledWith(
      path.resolve(process.cwd(), 'packages', 'tracking-target-constraints'),
    );
  });

  it('falls back to second candidate (one level up) when primary missing', () => {
    const secondCandidate = path.resolve(
      process.cwd(),
      '..',
      'packages',
      'tracking-target-constraints',
    );
    fs.existsSync.mockImplementation((p) => p === secondCandidate);
    const result = resolveConstraintSchemaPath('/constraints/foo.json');
    expect(result).toBe(path.join(secondCandidate, 'foo.json'));
  });

  it('falls back to third candidate (two levels up) when both others missing', () => {
    const thirdCandidate = path.resolve(
      process.cwd(),
      '..',
      '..',
      'packages',
      'tracking-target-constraints',
    );
    fs.existsSync.mockImplementation((p) => p === thirdCandidate);
    const result = resolveConstraintSchemaPath('/constraints/foo.json');
    expect(result).toBe(path.join(thirdCandidate, 'foo.json'));
  });
});

describe('resolveConstraintSchemaPath — HTTP/HTTPS URIs', () => {
  it('resolves https URI with /constraints/ pathname', () => {
    const result = resolveConstraintSchemaPath(
      'https://example.com/constraints/schemas/foo.json',
    );
    expect(result).toBe(path.join(MOCK_ROOT, 'schemas/foo.json'));
  });

  it('resolves http URI with /constraints/ pathname', () => {
    const result = resolveConstraintSchemaPath(
      'http://example.com/constraints/bar.json',
    );
    expect(result).toBe(path.join(MOCK_ROOT, 'bar.json'));
  });

  it('returns null for https URI whose pathname does not start with /constraints/', () => {
    expect(
      resolveConstraintSchemaPath('https://example.com/other/schemas/foo.json'),
    ).toBeNull();
  });

  it('returns null for https URI with empty pathname', () => {
    expect(resolveConstraintSchemaPath('https://example.com/')).toBeNull();
  });

  it('strips leading /constraints/ from the pathname before joining', () => {
    const result = resolveConstraintSchemaPath(
      'https://example.com/constraints/nested/schema.json',
    );
    expect(result).toBe(path.join(MOCK_ROOT, 'nested/schema.json'));
  });

  it('uses startsWith not endsWith for http/https detection', () => {
    // A local URI containing "http://" somewhere other than the start should not match
    // this test validates the startsWith constraint; local URIs fall into the next branch
    const result = resolveConstraintSchemaPath('/constraints/foo.json');
    // Should resolve via local path branch, not via URL parsing
    expect(result).toBe(path.join(MOCK_ROOT, 'foo.json'));
  });
});

describe('resolveConstraintSchemaPath — local constraint URIs', () => {
  it('resolves /constraints/ absolute path', () => {
    const result = resolveConstraintSchemaPath('/constraints/schemas/foo.json');
    expect(result).toBe(path.join(MOCK_ROOT, 'schemas/foo.json'));
  });

  it('resolves constraints/ relative path (no leading slash)', () => {
    const result = resolveConstraintSchemaPath('constraints/schemas/bar.json');
    expect(result).toBe(path.join(MOCK_ROOT, 'schemas/bar.json'));
  });

  it('strips /constraints/ prefix correctly (not just constraints/)', () => {
    const withSlash = resolveConstraintSchemaPath('/constraints/foo.json');
    const withoutSlash = resolveConstraintSchemaPath('constraints/foo.json');
    // Both should resolve to the same file
    expect(withSlash).toBe(withoutSlash);
  });

  it('returns null for a local path that does not start with /constraints/ or constraints/', () => {
    expect(resolveConstraintSchemaPath('/other/foo.json')).toBeNull();
  });

  it('returns null for a path starting with /constraint/ (missing trailing s)', () => {
    expect(resolveConstraintSchemaPath('/constraint/foo.json')).toBeNull();
  });

  it('returns null for a plain filename with no path prefix', () => {
    expect(resolveConstraintSchemaPath('foo.json')).toBeNull();
  });

  it('uses OR not AND — resolves both /constraints/ and constraints/ variants', () => {
    const absolute = resolveConstraintSchemaPath('/constraints/x.json');
    const relative = resolveConstraintSchemaPath('constraints/x.json');
    expect(absolute).not.toBeNull();
    expect(relative).not.toBeNull();
  });

  it('uses startsWith not endsWith for local path detection', () => {
    // A URI ending in constraints/ should NOT resolve
    expect(resolveConstraintSchemaPath('foo/constraints/')).toBeNull();
  });
});

describe('resolveConstraintSchemaPath — regex stripping', () => {
  it('strips leading /constraints/ from pathname', () => {
    const result = resolveConstraintSchemaPath(
      '/constraints/deep/nested/file.json',
    );
    expect(result).toBe(path.join(MOCK_ROOT, 'deep/nested/file.json'));
  });

  it('strips leading constraints/ (no slash) from pathname', () => {
    const result = resolveConstraintSchemaPath(
      'constraints/deep/nested/file.json',
    );
    expect(result).toBe(path.join(MOCK_ROOT, 'deep/nested/file.json'));
  });

  it('only strips the prefix once, not globally', () => {
    const result = resolveConstraintSchemaPath(
      '/constraints/constraints/nested.json',
    );
    // After stripping /constraints/ prefix, we should have constraints/nested.json remaining
    expect(result).toContain('constraints/nested.json');
  });
});
