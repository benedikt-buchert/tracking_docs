'use strict';

const { parse } = require('@babel/parser');

function calculateCrap(complexity, coveragePercent) {
  const coverage = Math.max(0, Math.min(100, coveragePercent)) / 100;
  const crap = complexity ** 2 * (1 - coverage) ** 3 + complexity;
  return Number(crap.toFixed(2));
}

function isAnalyzableSourceFile(filePath) {
  return (
    filePath.startsWith('packages/') &&
    filePath.endsWith('.js') &&
    !filePath.includes('/__tests__/') &&
    !filePath.includes('/__mocks__/') &&
    !filePath.includes('/test-data/') &&
    !filePath.includes('/components/') &&
    !filePath.includes('/scripts/')
  );
}

function collectFunctionReports(filePath, sourceText, coverage) {
  const ast = parse(sourceText, {
    sourceType: 'unambiguous',
    plugins: ['jsx'],
    errorRecovery: true,
  });

  return collectFunctionCandidates(ast).map(({ name, node }) => {
    const startLine = node.loc.start.line;
    const endLine = node.loc.end.line;
    const complexity = computeCyclomaticComplexity(node);
    const statementCoverage = calculateStatementCoverage(
      coverage,
      startLine,
      endLine,
    );

    return {
      filePath,
      name,
      complexity,
      statementCoverage,
      crap: calculateCrap(complexity, statementCoverage),
      startLine,
      endLine,
    };
  });
}

function filterReportsByFiles(reports, filePaths) {
  return reports.filter((report) => filePaths.has(report.filePath));
}

function findReportsOverThreshold(reports, threshold) {
  return reports.filter((report) => report.crap > threshold);
}

function collectFunctionCandidates(ast) {
  const functions = [];
  visitNode(ast, null, functions);
  return functions;
}

function visitNode(node, parent, functions) {
  if (!node || typeof node !== 'object') return;

  const candidate = toFunctionCandidate(node, parent);
  if (candidate) functions.push(candidate);

  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'loc' || key === 'start' || key === 'end')
      continue;
    const child = node[key];
    if (Array.isArray(child)) {
      for (const item of child) visitNode(item, node, functions);
    } else if (child && typeof child === 'object' && child.type) {
      visitNode(child, node, functions);
    }
  }
}

function toFunctionCandidate(node, parent) {
  if (node.type === 'FunctionDeclaration' && node.id) {
    return { name: node.id.name, node };
  }

  if (
    (node.type === 'FunctionExpression' ||
      node.type === 'ArrowFunctionExpression') &&
    parent &&
    parent.type === 'VariableDeclarator' &&
    parent.id &&
    parent.id.type === 'Identifier'
  ) {
    return { name: parent.id.name, node };
  }

  if (node.type === 'ObjectMethod' && node.key) {
    return { name: node.key.name ?? node.key.value, node };
  }

  if (
    node.type === 'ClassMethod' &&
    node.key &&
    node.key.type === 'Identifier'
  ) {
    return { name: node.key.name, node };
  }

  return null;
}

function computeCyclomaticComplexity(node) {
  let complexity = 1;

  function visit(child) {
    if (!child || typeof child !== 'object') return;
    if (increasesCyclomaticComplexity(child)) complexity += 1;

    for (const key of Object.keys(child)) {
      if (key === 'type' || key === 'loc' || key === 'start' || key === 'end')
        continue;
      const value = child[key];
      if (Array.isArray(value)) {
        for (const item of value) visit(item);
      } else if (value && typeof value === 'object' && value.type) {
        visit(value);
      }
    }
  }

  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'loc' || key === 'start' || key === 'end')
      continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
    } else if (value && typeof value === 'object' && value.type) {
      visit(value);
    }
  }

  return complexity;
}

function increasesCyclomaticComplexity(node) {
  switch (node.type) {
    case 'IfStatement':
    case 'ConditionalExpression':
    case 'ForStatement':
    case 'ForInStatement':
    case 'ForOfStatement':
    case 'WhileStatement':
    case 'DoWhileStatement':
    case 'CatchClause':
    case 'SwitchCase':
      return true;
    case 'LogicalExpression':
      return (
        node.operator === '&&' ||
        node.operator === '||' ||
        node.operator === '??'
      );
    default:
      return false;
  }
}

function calculateStatementCoverage(coverage, startLine, endLine) {
  let total = 0;
  let covered = 0;

  for (const [id, location] of Object.entries(coverage.statementMap)) {
    if (!isRangeInside(location, startLine, endLine)) continue;
    total += 1;
    if ((coverage.s[id] ?? 0) > 0) covered += 1;
  }

  if (total === 0) return 0;
  return Number(((covered / total) * 100).toFixed(2));
}

function isRangeInside(location, startLine, endLine) {
  return location.start.line >= startLine && location.end.line <= endLine;
}

module.exports = {
  calculateCrap,
  isAnalyzableSourceFile,
  collectFunctionReports,
  filterReportsByFiles,
  findReportsOverThreshold,
};
