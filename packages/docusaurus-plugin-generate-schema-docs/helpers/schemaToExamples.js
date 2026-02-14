import buildExampleFromSchema from './buildExampleFromSchema';
import mergeJsonSchema from 'json-schema-merge-allof';

const findChoicePoints = (subSchema, path = []) => {
  if (!subSchema) {
    return [];
  }

  const choiceType = subSchema.oneOf
    ? 'oneOf'
    : subSchema.anyOf
      ? 'anyOf'
      : null;
  const currentChoice = choiceType ? [{ path, schema: subSchema }] : [];

  const nestedChoices = subSchema.properties
    ? Object.entries(subSchema.properties).flatMap(([key, propSchema]) =>
        findChoicePoints(propSchema, [...path, 'properties', key]),
      )
    : [];

  return [...currentChoice, ...nestedChoices];
};

const generateExampleForChoice = (rootSchema, path, option) => {
  const schemaVariant = JSON.parse(JSON.stringify(rootSchema));

  if (path.length === 0) {
    delete schemaVariant.oneOf;
    delete schemaVariant.anyOf;
    const newSchemaVariant = mergeJsonSchema({
      allOf: [schemaVariant, option],
    });
    return buildExampleFromSchema(newSchemaVariant);
  } else {
    let parentOfChoice = schemaVariant;
    for (let i = 0; i < path.length; i++) {
      parentOfChoice = parentOfChoice[path[i]];
    }
    delete parentOfChoice.oneOf;
    delete parentOfChoice.anyOf;
    Object.assign(parentOfChoice, option);
    return buildExampleFromSchema(schemaVariant);
  }
};

export function schemaToExamples(rootSchema) {
  const choicePoints = findChoicePoints(rootSchema);

  if (choicePoints.length === 0) {
    const example = buildExampleFromSchema(rootSchema);
    if (example && Object.keys(example).length > 0) {
      return [
        { property: 'default', options: [{ title: 'Example', example }] },
      ];
    }
    return [];
  }

  return choicePoints.map(({ path, schema }) => {
    const choiceType = schema.oneOf ? 'oneOf' : 'anyOf';
    const propertyName = path.length > 0 ? path[path.length - 1] : 'root';

    const options = schema[choiceType].map((option) => ({
      title: option.title || 'Option',
      example: generateExampleForChoice(rootSchema, path, option),
    }));

    return { property: propertyName, options };
  });
}
