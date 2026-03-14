function visitSchemaNodes(schema, visitor, path = []) {
  if (!schema || typeof schema !== 'object') {
    return;
  }

  visitor(schema, { path });

  if (schema.properties && typeof schema.properties === 'object') {
    Object.entries(schema.properties).forEach(([key, propertySchema]) => {
      visitSchemaNodes(propertySchema, visitor, [...path, 'properties', key]);
    });
  }

  if (schema.items && typeof schema.items === 'object') {
    visitSchemaNodes(schema.items, visitor, [...path, 'items']);
  }

  if (Array.isArray(schema.oneOf)) {
    schema.oneOf.forEach((optionSchema, index) => {
      visitSchemaNodes(optionSchema, visitor, [...path, 'oneOf', index]);
    });
  }

  if (Array.isArray(schema.anyOf)) {
    schema.anyOf.forEach((optionSchema, index) => {
      visitSchemaNodes(optionSchema, visitor, [...path, 'anyOf', index]);
    });
  }

  if (schema.if && typeof schema.if === 'object') {
    visitSchemaNodes(schema.if, visitor, [...path, 'if']);
  }

  if (schema.then && typeof schema.then === 'object') {
    visitSchemaNodes(schema.then, visitor, [...path, 'then']);
  }

  if (schema.else && typeof schema.else === 'object') {
    visitSchemaNodes(schema.else, visitor, [...path, 'else']);
  }
}

function visitPropertyEntryBranches(
  schema,
  visitor,
  { prefix = '', path = [], skipArraySubProperties = false } = {},
) {
  if (!schema || typeof schema !== 'object') {
    return;
  }

  if (Array.isArray(schema.oneOf)) {
    schema.oneOf.forEach((optionSchema, index) => {
      visitSchemaPropertyEntries(optionSchema, visitor, {
        prefix,
        path: [...path, 'oneOf', index],
        skipArraySubProperties,
      });
    });
  }

  if (Array.isArray(schema.anyOf)) {
    schema.anyOf.forEach((optionSchema, index) => {
      visitSchemaPropertyEntries(optionSchema, visitor, {
        prefix,
        path: [...path, 'anyOf', index],
        skipArraySubProperties,
      });
    });
  }

  if (schema.then && typeof schema.then === 'object') {
    visitSchemaPropertyEntries(schema.then, visitor, {
      prefix,
      path: [...path, 'then'],
      skipArraySubProperties,
    });
  }

  if (schema.else && typeof schema.else === 'object') {
    visitSchemaPropertyEntries(schema.else, visitor, {
      prefix,
      path: [...path, 'else'],
      skipArraySubProperties,
    });
  }
}

function visitSchemaPropertyEntries(
  schema,
  visitor,
  { prefix = '', path = [], skipArraySubProperties = false } = {},
) {
  if (!schema || typeof schema !== 'object') {
    return;
  }

  if (schema.properties && typeof schema.properties === 'object') {
    Object.entries(schema.properties).forEach(([key, propertySchema]) => {
      const currentName = prefix ? `${prefix}.${key}` : key;
      const currentPath = [...path, 'properties', key];

      visitor(propertySchema, {
        key,
        name: currentName,
        path: currentPath,
        parentSchema: schema,
      });

      if (propertySchema?.type === 'object' && propertySchema.properties) {
        visitSchemaPropertyEntries(propertySchema, visitor, {
          prefix: currentName,
          path: currentPath,
          skipArraySubProperties,
        });
      }

      if (
        propertySchema?.type === 'array' &&
        propertySchema.items?.properties &&
        !skipArraySubProperties
      ) {
        visitSchemaPropertyEntries(propertySchema.items, visitor, {
          prefix: `${currentName}.0`,
          path: [...currentPath, 'items'],
          skipArraySubProperties,
        });
      }

      visitPropertyEntryBranches(propertySchema, visitor, {
        prefix: currentName,
        path: currentPath,
        skipArraySubProperties,
      });
    });
  }

  visitPropertyEntryBranches(schema, visitor, {
    prefix,
    path,
    skipArraySubProperties,
  });
}

module.exports = {
  visitSchemaNodes,
  visitSchemaPropertyEntries,
};
