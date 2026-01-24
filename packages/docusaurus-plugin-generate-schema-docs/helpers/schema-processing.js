import path from 'path';
import processSchema from './processSchema.js';

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

export async function processOneOfSchema(schema, filePath) {
  const processedSchemas = [];
  const choiceType = schema.oneOf ? 'oneOf' : null;

  if (choiceType) {
    const parentWithoutChoice = { ...schema };
    delete parentWithoutChoice[choiceType];

    for (const option of schema[choiceType]) {
      let resolvedOption = option;
      if (option.$ref && !option.$ref.startsWith('#')) {
        const refPath = path.resolve(path.dirname(filePath), option.$ref);
        resolvedOption = await processSchema(refPath);
      }

      // Merge the parent schema with the resolved option schema
      const newSchema = { ...parentWithoutChoice, ...resolvedOption };
      newSchema.properties = {
        ...parentWithoutChoice.properties,
        ...resolvedOption.properties,
      };

      let slug;
      const hadId = resolvedOption.$id && resolvedOption.$id.endsWith('.json');
      if (hadId) {
        slug = path.basename(resolvedOption.$id, '.json');
      } else {
        slug = slugify(newSchema.title);
      }

      if (!hadId) {
        newSchema.$id = `${schema.$id}#${slug}`;
      }

      processedSchemas.push({
        slug,
        schema: newSchema,
      });
    }
  }

  return processedSchemas;
}
