import path from 'path';
import fs from 'fs';
import processSchema from './processSchema.js';
import mergeJsonSchema from 'json-schema-merge-allof';

function mergePropertySchemas(baseProperties = {}, optionProperties = {}) {
  const mergedProperties = {
    ...baseProperties,
    ...optionProperties,
  };

  for (const key of Object.keys(baseProperties)) {
    if (!Object.prototype.hasOwnProperty.call(optionProperties, key)) {
      continue;
    }

    mergedProperties[key] = mergeJsonSchema(
      {
        allOf: [baseProperties[key], optionProperties[key]],
      },
      {
        resolvers: {
          defaultResolver: mergeJsonSchema.options.resolvers.title,
        },
      },
    );
  }

  return mergedProperties;
}

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

export async function processOneOfSchema(schema, filePath) {
  const processedSchemas = [];
  const choiceType = schema.oneOf ? 'oneOf' : null;

  if (choiceType) {
    let parentSchema = schema;

    // When the root schema is loaded from disk, use its processed form so
    // parent-level allOf refs (e.g. shared dataLayer metadata) are preserved.
    if (filePath && fs.existsSync(filePath)) {
      parentSchema = await processSchema(filePath);
    }

    const parentWithoutChoice = { ...parentSchema };
    delete parentWithoutChoice[choiceType];

    for (const option of schema[choiceType]) {
      let resolvedOption = option;
      let sourceFilePath = null;
      if (option.$ref && !option.$ref.startsWith('#')) {
        const refPath = path.resolve(path.dirname(filePath), option.$ref);
        sourceFilePath = refPath;
        resolvedOption = await processSchema(refPath);
      }

      // Merge the parent schema with the resolved option schema
      const newSchema = { ...parentWithoutChoice, ...resolvedOption };
      newSchema.properties = mergePropertySchemas(
        parentWithoutChoice.properties,
        resolvedOption.properties,
      );

      let slug;
      const hadId = resolvedOption.$id && resolvedOption.$id.endsWith('.json');
      if (hadId) {
        slug = path.basename(resolvedOption.$id, '.json');
      } else if (resolvedOption.$anchor) {
        slug = resolvedOption.$anchor;
      } else {
        slug = slugify(newSchema.title);
      }

      if (!hadId) {
        newSchema.$id = `${schema.$id}#${slug}`;
      }

      processedSchemas.push({
        slug,
        schema: newSchema,
        sourceFilePath,
      });
    }
  }

  return processedSchemas;
}
