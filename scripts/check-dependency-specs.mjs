import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packageFiles = [
  path.join(root, 'package.json'),
  path.join(root, 'demo', 'package.json'),
  path.join(
    root,
    'packages',
    'docusaurus-plugin-generate-schema-docs',
    'package.json',
  ),
];

const blockedTagSpecs = new Set(['latest', 'next', 'canary', 'beta', 'alpha']);
const blockedWildcardSpec = '*';
const wildcardAllowList = new Set(['workspace:*']);
const dependencySections = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
];

const violations = [];

for (const file of packageFiles) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));

  for (const section of dependencySections) {
    const deps = data[section] || {};

    for (const [name, spec] of Object.entries(deps)) {
      const normalized = String(spec).trim();
      const lower = normalized.toLowerCase();

      if (blockedTagSpecs.has(lower)) {
        violations.push(
          `${path.relative(root, file)} -> ${section}.${name}: "${spec}" uses a dist-tag`,
        );
        continue;
      }

      if (
        normalized === blockedWildcardSpec &&
        !wildcardAllowList.has(normalized)
      ) {
        violations.push(
          `${path.relative(root, file)} -> ${section}.${name}: "*" is non-deterministic`,
        );
      }
    }
  }
}

if (violations.length > 0) {
  console.error('Non-deterministic dependency specs found:\n');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Dependency spec check passed.');
