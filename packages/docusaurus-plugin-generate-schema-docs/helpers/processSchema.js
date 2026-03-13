import $RefParser from '@apidevtools/json-schema-ref-parser';
import fs from 'fs';
import { resolveConstraintSchemaPath } from './constraintSchemaPaths.js';
import { mergeSchema } from './mergeSchema.js';

function unwrapRedundantNotAnyOf(node) {
  if (!node || typeof node !== 'object') {
    return node;
  }

  if (Array.isArray(node)) {
    return node.map(unwrapRedundantNotAnyOf);
  }

  const normalized = {};
  for (const [key, value] of Object.entries(node)) {
    normalized[key] = unwrapRedundantNotAnyOf(value);
  }

  if (normalized.not && typeof normalized.not === 'object') {
    let candidate = normalized.not;
    while (
      candidate &&
      typeof candidate === 'object' &&
      !Array.isArray(candidate) &&
      Array.isArray(candidate.anyOf) &&
      candidate.anyOf.length === 1
    ) {
      candidate = candidate.anyOf[0];
    }
    normalized.not = candidate;
  }

  return normalized;
}

/**
 * Processes a JSON schema file by bundling external references,
 * dereferencing internal references, and merging allOf properties.
 *
 * @param {string} filePath Path to the JSON schema file.
 * @returns {Promise<object>} The processed (merged) schema.
 */
export default async function processSchema(filePath) {
  // 1. Bundle all external references into a single, self-contained schema
  const bundledSchema = await $RefParser.bundle(filePath, {
    mutateInputSchema: false,
    resolve: {
      constraints: {
        order: 1,
        canRead: (file) => Boolean(resolveConstraintSchemaPath(file.url)),
        read: (file) => {
          const localPath = resolveConstraintSchemaPath(file.url);
          if (!localPath) {
            throw new Error(
              `Could not resolve local path for constraint ref: ${file.url}`,
            );
          }
          return fs.readFileSync(localPath, 'utf8');
        },
      },
    },
  });

  // 2. Dereference the bundled schema to resolve internal refs for allOf merging
  const dereferencedSchema = await $RefParser.dereference(bundledSchema, {
    dereference: {
      circular: 'ignore', // Keep recursive parts as $refs
    },
  });

  // Then merge allOf properties
  const mergedSchema = mergeSchema(dereferencedSchema);

  return unwrapRedundantNotAnyOf(mergedSchema);
}
