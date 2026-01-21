import $RefParser from '@apidevtools/json-schema-ref-parser';
import mergeJsonSchema from 'json-schema-merge-allof';

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
  });

  // 2. Dereference the bundled schema to resolve internal refs for allOf merging
  const dereferencedSchema = await $RefParser.dereference(bundledSchema, {
    dereference: {
      circular: 'ignore', // Keep recursive parts as $refs
    },
  });

  // Then merge allOf properties
  const mergedSchema = mergeJsonSchema(dereferencedSchema, {
    resolvers: {
      defaultResolver: mergeJsonSchema.options.resolvers.title,
    },
  });

  return mergedSchema;
}
