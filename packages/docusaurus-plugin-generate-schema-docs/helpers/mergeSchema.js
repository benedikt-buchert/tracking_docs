import mergeJsonSchema from 'json-schema-merge-allof';

const baseResolvers = {
  $defs: mergeJsonSchema.options.resolvers.definitions,
  defaultResolver: mergeJsonSchema.options.resolvers.title,
};

export function mergeSchema(schema, options = {}) {
  return mergeJsonSchema(schema, {
    ...options,
    resolvers: {
      ...baseResolvers,
      ...(options.resolvers || {}),
    },
  });
}
