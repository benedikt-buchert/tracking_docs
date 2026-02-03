export function getSingleExampleValue(propSchema) {
  if (Object.prototype.hasOwnProperty.call(propSchema, 'const')) {
    return propSchema.const;
  }
  if (propSchema.examples?.length > 0) {
    return propSchema.examples[0];
  }
  if (propSchema.example) {
    return propSchema.example;
  }
  if (Object.prototype.hasOwnProperty.call(propSchema, 'default')) {
    return propSchema.default;
  }
  return undefined;
}

export function getExamples(propSchema) {
  if (Object.prototype.hasOwnProperty.call(propSchema, 'const')) {
    return [propSchema.const];
  }

  const examples = [];

  if (propSchema.examples) {
    examples.push(...propSchema.examples);
  }

  if (propSchema.example) {
    if (!examples.includes(propSchema.example)) {
      examples.push(propSchema.example);
    }
  }

  if (Object.prototype.hasOwnProperty.call(propSchema, 'default')) {
    if (!examples.includes(propSchema.default)) {
      examples.push(propSchema.default);
    }
  }

  return examples.length > 0 ? examples : undefined;
}
