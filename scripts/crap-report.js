'use strict';

const { execFileSync } = require('node:child_process');
const { readFileSync, readdirSync, statSync } = require('node:fs');
const { join, relative, resolve } = require('node:path');
const {
  collectFunctionReports,
  filterReportsByFiles,
  findReportsOverThreshold,
  isAnalyzableSourceFile,
} = require('./crap');

const ROOT = resolve(__dirname, '..');
const COVERAGE_PATH = resolve(ROOT, 'coverage', 'coverage-final.json');

function runCrapReport(argv, dependencies = defaultDependencies) {
  const options = parseArgs(argv, dependencies.execFileSyncFn);
  const coverage = JSON.parse(
    dependencies.readFileSyncFn(COVERAGE_PATH, 'utf8'),
  );

  const files = listSourceFiles(
    resolve(ROOT, 'packages'),
    dependencies.readdirSyncFn,
    dependencies.statSyncFn,
  )
    .map((filePath) => relative(ROOT, filePath).replaceAll('\\', '/'))
    .filter(isAnalyzableSourceFile);

  const reports = files.flatMap((filePath) => {
    const absolutePath = resolve(ROOT, filePath);
    const fileCoverage = findCoverageForFile(coverage, absolutePath, filePath);
    if (!fileCoverage) return [];

    const sourceText = dependencies.readFileSyncFn(absolutePath, 'utf8');
    return collectFunctionReports(filePath, sourceText, {
      path: filePath,
      statementMap: fileCoverage.statementMap,
      s: fileCoverage.s,
    });
  });

  const selectedReports =
    options.stagedFiles === undefined
      ? reports
      : filterReportsByFiles(reports, options.stagedFiles);
  const sorted = [...selectedReports].sort((a, b) => b.crap - a.crap);

  if (sorted.length === 0) {
    dependencies.write('No analyzable files selected for CRAP reporting.\n');
    return;
  }

  const rows = sorted
    .map((r) =>
      [
        r.filePath,
        r.name,
        String(r.startLine),
        String(r.complexity),
        String(r.statementCoverage),
        String(r.crap),
      ].join('\t'),
    )
    .join('\n');
  dependencies.write(
    ['file\tfunction\tline\tcomplexity\tcoverage\tcrap', rows, ''].join('\n'),
  );

  if (options.threshold !== undefined) {
    const failures = findReportsOverThreshold(sorted, options.threshold);
    if (failures.length > 0) {
      const summary = failures
        .map((r) => `${r.filePath}:${r.startLine} ${r.name}=${r.crap}`)
        .join(', ');
      throw new Error(
        `CRAP threshold ${options.threshold} exceeded: ${summary}`,
      );
    }
  }
}

function findCoverageForFile(coverage, absolutePath, relativePath) {
  return (
    coverage[absolutePath] ??
    coverage[relativePath] ??
    coverage[relativePath.replaceAll('\\', '/')]
  );
}

function listSourceFiles(
  directory,
  readdirSyncFn = readdirSync,
  statSyncFn = statSync,
) {
  const entries = readdirSyncFn(directory).sort();
  const files = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry);
    const stats = statSyncFn(entryPath);
    if (stats.isDirectory()) {
      files.push(...listSourceFiles(entryPath, readdirSyncFn, statSyncFn));
    } else {
      files.push(entryPath);
    }
  }

  return files;
}

function parseArgs(argv, execFileSyncFn = execFileSync) {
  const options = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--staged') {
      options.stagedFiles = getStagedFiles(execFileSyncFn);
    } else if (arg === '--threshold') {
      const next = argv[i + 1];
      if (next === undefined) throw new Error('Missing value for --threshold');
      options.threshold = Number(next);
      i += 1;
    }
  }

  return options;
}

function getStagedFiles(execFileSyncFn = execFileSync) {
  const output = execFileSyncFn(
    'git',
    ['diff', '--cached', '--name-only', '--diff-filter=ACMR'],
    {
      cwd: ROOT,
      encoding: 'utf8',
    },
  );

  return new Set(
    output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0),
  );
}

const defaultDependencies = {
  execFileSyncFn: execFileSync,
  readFileSyncFn: readFileSync,
  readdirSyncFn: readdirSync,
  statSyncFn: statSync,
  write: (text) => process.stdout.write(text),
};

function main() {
  runCrapReport(process.argv.slice(2));
}

if (require.main === module) {
  main();
}

module.exports = {
  runCrapReport,
  findCoverageForFile,
  listSourceFiles,
  parseArgs,
  getStagedFiles,
};
