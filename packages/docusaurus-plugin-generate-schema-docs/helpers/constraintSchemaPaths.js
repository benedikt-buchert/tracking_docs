import path from 'path';
import fs from 'fs';

function buildCandidatePaths(baseSegments, packageName) {
  return [
    path.resolve(process.cwd(), ...baseSegments, packageName),
    path.resolve(process.cwd(), '..', ...baseSegments, packageName),
    path.resolve(process.cwd(), '..', '..', ...baseSegments, packageName),
  ];
}

function getConstraintsPackageRoot() {
  const candidates = [
    ...buildCandidatePaths(['packages'], 'tracking-target-constraints'),
    ...buildCandidatePaths(['node_modules'], 'tracking-target-constraints'),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function stripConstraintsPrefix(value) {
  return value.replace(/^\/?constraints\//, '');
}

export function resolveConstraintSchemaPath(uri) {
  if (!uri || typeof uri !== 'string') return null;

  const constraintsPackageRoot = getConstraintsPackageRoot();
  if (!constraintsPackageRoot) return null;

  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    const { pathname } = new URL(uri);
    if (!pathname.startsWith('/constraints/')) return null;
    return path.join(constraintsPackageRoot, stripConstraintsPrefix(pathname));
  }

  if (uri.startsWith('/constraints/') || uri.startsWith('constraints/')) {
    return path.join(constraintsPackageRoot, stripConstraintsPrefix(uri));
  }

  return null;
}
