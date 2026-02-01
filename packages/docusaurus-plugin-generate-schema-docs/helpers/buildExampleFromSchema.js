import { getSingleExampleValue } from './example-helper';

/**
 * Recursively builds a single, default example object from a JSON schema.
 * It prefers explicit examples, consts, or defaults. For choices (`oneOf`/`anyOf`),
 * it defaults to the first option.
 *
 * @param {object} schema The schema to build an example from.
 * @returns {object|undefined} The generated example.
 */
const buildExampleFromSchema = (schema) => {
  if (!schema) return undefined;

  // For choices, default to the first option.
  if (schema.oneOf?.length > 0) {
    return buildExampleFromSchema(schema.oneOf[0]);
  }
  if (schema.anyOf?.length > 0) {
    return buildExampleFromSchema(schema.anyOf[0]);
  }

  const exampleValue = getSingleExampleValue(schema);
  if (typeof exampleValue !== 'undefined') {
    return exampleValue;
  }

  let type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  if (!type && schema.properties) {
    type = 'object';
  }

  if (type === 'object') {
    if (schema.properties) {
      const obj = {};
      Object.entries(schema.properties).forEach(([key, propSchema]) => {
        const value = buildExampleFromSchema(propSchema);
        if (typeof value !== 'undefined') {
          obj[key] = value;
        }
      });
      // Return undefined for objects that end up empty.
      return Object.keys(obj).length > 0 ? obj : undefined;
    }
    // No properties defined, treat as an empty object (which we filter out).
    return undefined;
  }

  if (type === 'array') {
    if (schema.items) {
      const itemValue = buildExampleFromSchema(schema.items);
      // Only return an array if the item schema generates a value.
      return typeof itemValue !== 'undefined' ? [itemValue] : undefined;
    }
    return undefined; // No items defined.
  }

  // Return placeholder values for primitive types if no other value is found.
  switch (type) {
    case 'string':
      return '';
    case 'integer':
    case 'number':
      return 0;
    case 'boolean':
      return false;
    default:
      return undefined;
  }
};

export default buildExampleFromSchema;
