import { getSingleExampleValue } from './example-helper';
import mergeJsonSchema from 'json-schema-merge-allof';

const getPrimitivePlaceholder = (type) => {
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

const buildExampleFromSchema = (schema) => {
  if (!schema) {
    return undefined;
  }

  // For choices, default to the first option and recurse.
  const choiceType = schema.oneOf ? 'oneOf' : schema.anyOf ? 'anyOf' : null;
  if (choiceType && schema[choiceType]?.length > 0) {
    const newSchema = { ...schema };
    const choice = newSchema[choiceType][0];
    delete newSchema[choiceType];
    const merged = mergeJsonSchema({ allOf: [newSchema, choice] });
    return buildExampleFromSchema(merged);
  }

  // If there's an explicit example, use it.
  const exampleValue = getSingleExampleValue(schema);
  if (typeof exampleValue !== 'undefined') {
    return exampleValue;
  }

  // Determine the type, defaulting to 'object' if properties are present.
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  const inferredType = !type && schema.properties ? 'object' : type;

  // Build examples based on type.
  if (inferredType === 'object' && schema.properties) {
    const obj = Object.entries(schema.properties).reduce(
      (acc, [key, propSchema]) => {
        const value = buildExampleFromSchema(propSchema);
        if (typeof value !== 'undefined') {
          acc[key] = value;
        }
        return acc;
      },
      {},
    );
    return Object.keys(obj).length > 0 ? obj : undefined;
  }

  if (inferredType === 'array' && schema.items) {
    const itemValue = buildExampleFromSchema(schema.items);
    return typeof itemValue !== 'undefined' ? [itemValue] : undefined;
  }

  return getPrimitivePlaceholder(inferredType);
};

export default buildExampleFromSchema;
