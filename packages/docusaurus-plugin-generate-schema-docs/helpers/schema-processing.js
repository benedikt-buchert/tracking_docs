import path from 'path';

export function slugify(text) {
  if (!text) {
    return 'option';
  }
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

export function fixRefs(obj, basePath) {
  for (const key in obj) {
    if (
      key === '$ref' &&
      typeof obj[key] === 'string' &&
      !obj[key].startsWith('#') &&
      !obj[key].startsWith('http')
    ) {
      obj[key] = path.resolve(basePath, obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      fixRefs(obj[key], basePath);
    }
  }
}

export function processOneOfSchema(schema, filePath) {
  const processedSchemas = [];
  const choiceType = schema.oneOf ? 'oneOf' : null;

  if (choiceType) {
    for (const optionSchema of schema[choiceType]) {
      const slug = slugify(optionSchema.title);
      const newSchema = {
        ...schema,
        ...optionSchema,
        properties: {
          ...schema.properties,
          ...optionSchema.properties,
        },
      };
      if (!optionSchema.$id) {
        newSchema.$id = `${schema.$id}#${slug}`;
      }
      delete newSchema.oneOf;
      delete newSchema.anyOf;
      delete newSchema.allOf;

      fixRefs(newSchema, path.dirname(filePath));

      processedSchemas.push({
        slug,
        schema: newSchema,
      });
    }
  }

  return processedSchemas;
}
