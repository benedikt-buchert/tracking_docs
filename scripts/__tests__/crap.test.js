/**
 * @jest-environment @stryker-mutator/jest-runner/jest-env/node
 */
'use strict';

const {
  calculateCrap,
  isAnalyzableSourceFile,
  collectFunctionReports,
} = require('../crap');

describe('calculateCrap', () => {
  it('returns complexity when coverage is 100%', () => {
    expect(calculateCrap(5, 100)).toBe(5);
  });

  it('returns complexity squared plus complexity when coverage is 0%', () => {
    expect(calculateCrap(5, 0)).toBe(30);
  });

  it('clamps coverage below 0', () => {
    expect(calculateCrap(1, -10)).toBe(calculateCrap(1, 0));
  });

  it('clamps coverage above 100', () => {
    expect(calculateCrap(1, 110)).toBe(calculateCrap(1, 100));
  });

  it('rounds to 2 decimal places', () => {
    const result = calculateCrap(3, 50);
    expect(result).toBe(Number(result.toFixed(2)));
  });
});

describe('isAnalyzableSourceFile', () => {
  it('accepts source js files under packages/', () => {
    expect(isAnalyzableSourceFile('packages/my-pkg/index.js')).toBe(true);
  });

  it('rejects test files', () => {
    expect(
      isAnalyzableSourceFile('packages/my-pkg/__tests__/foo.test.js'),
    ).toBe(false);
  });

  it('rejects mock files', () => {
    expect(isAnalyzableSourceFile('packages/my-pkg/__mocks__/foo.js')).toBe(
      false,
    );
  });

  it('rejects component files', () => {
    expect(isAnalyzableSourceFile('packages/my-pkg/components/Foo.js')).toBe(
      false,
    );
  });

  it('rejects test-data files', () => {
    expect(isAnalyzableSourceFile('packages/my-pkg/test-data/foo.js')).toBe(
      false,
    );
  });

  it('rejects files outside packages/', () => {
    expect(isAnalyzableSourceFile('scripts/crap.js')).toBe(false);
  });
});

describe('collectFunctionReports', () => {
  const coverage = {
    path: 'packages/foo/bar.js',
    statementMap: {
      0: { start: { line: 2, column: 0 }, end: { line: 2, column: 10 } },
      1: { start: { line: 3, column: 0 }, end: { line: 3, column: 10 } },
    },
    s: { 0: 1, 1: 0 },
  };

  it('returns a report for each function', () => {
    const source = `function add(a, b) {\n  return a + b;\n}`;
    const reports = collectFunctionReports(
      'packages/foo/bar.js',
      source,
      coverage,
    );
    expect(reports).toHaveLength(1);
    expect(reports[0].name).toBe('add');
  });

  it('complexity is 1 for a straight-line function', () => {
    const source = `function noop() {\n  return 1;\n}`;
    const reports = collectFunctionReports(
      'packages/foo/bar.js',
      source,
      coverage,
    );
    expect(reports[0].complexity).toBe(1);
  });

  it('complexity increases for if statements', () => {
    const source = `function check(x) {\n  if (x) {\n    return 1;\n  }\n  return 0;\n}`;
    const reports = collectFunctionReports(
      'packages/foo/bar.js',
      source,
      coverage,
    );
    expect(reports[0].complexity).toBe(2);
  });

  it('reports startLine and endLine', () => {
    const source = `function foo() {\n  return 1;\n}`;
    const reports = collectFunctionReports(
      'packages/foo/bar.js',
      source,
      coverage,
    );
    expect(reports[0].startLine).toBe(1);
    expect(reports[0].endLine).toBe(3);
  });
});
