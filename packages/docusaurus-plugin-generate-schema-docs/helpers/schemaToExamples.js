import buildExampleFromSchema from './buildExampleFromSchema';
import { mergeSchema } from './mergeSchema.js';

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

const findConditionalPoints = (subSchema, path = []) => {
  if (!subSchema) {
    return [];
  }

  const currentConditional =
    subSchema.if && (subSchema.then || subSchema.else)
      ? [{ path, schema: subSchema }]
      : [];

  const nestedConditionals = subSchema.properties
    ? Object.entries(subSchema.properties).flatMap(([key, propSchema]) =>
        findConditionalPoints(propSchema, [...path, 'properties', key]),
      )
    : [];

  return [...currentConditional, ...nestedConditionals];
};

const generateExampleForChoice = (rootSchema, path, option) => {
  const schemaVariant = JSON.parse(JSON.stringify(rootSchema));

  if (path.length === 0) {
    delete schemaVariant.oneOf;
    delete schemaVariant.anyOf;
    const newSchemaVariant = mergeSchema({
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

const pruneSiblingConditionalProperties = (
  mergedSchema,
  activeBranchSchema,
  inactiveBranchSchema,
  baseRequired = [],
) => {
  const branchesOnlyAdjustRequired =
    !activeBranchSchema?.properties && !inactiveBranchSchema?.properties;

  if (
    !mergedSchema?.properties ||
    !branchesOnlyAdjustRequired ||
    !Array.isArray(inactiveBranchSchema?.required)
  ) {
    return mergedSchema;
  }

  const activeRequired = new Set(activeBranchSchema?.required || []);
  const protectedRequired = new Set(baseRequired);

  inactiveBranchSchema.required.forEach((name) => {
    if (activeRequired.has(name) || protectedRequired.has(name)) {
      return;
    }

    delete mergedSchema.properties[name];
    if (Array.isArray(mergedSchema.required)) {
      mergedSchema.required = mergedSchema.required.filter(
        (requiredName) => requiredName !== name,
      );
    }
  });

  return mergedSchema;
};

const generateConditionalExample = (rootSchema, path, branch) => {
  const schemaVariant = JSON.parse(JSON.stringify(rootSchema));
  const siblingBranch = branch === 'then' ? 'else' : 'then';

  if (path.length === 0) {
    const branchSchema = schemaVariant[branch];
    const siblingBranchSchema = schemaVariant[siblingBranch];
    const baseRequired = schemaVariant.required || [];
    delete schemaVariant.if;
    delete schemaVariant.then;
    delete schemaVariant.else;
    if (branchSchema) {
      const merged = pruneSiblingConditionalProperties(
        mergeSchema({ allOf: [schemaVariant, branchSchema] }),
        branchSchema,
        siblingBranchSchema,
        baseRequired,
      );
      return buildExampleFromSchema(merged);
    }
    return buildExampleFromSchema(schemaVariant);
  }

  let target = schemaVariant;
  for (const segment of path) {
    target = target[segment];
  }
  const branchSchema = target[branch];
  const siblingBranchSchema = target[siblingBranch];
  const baseRequired = target.required || [];
  delete target.if;
  delete target.then;
  delete target.else;
  if (branchSchema) {
    const merged = pruneSiblingConditionalProperties(
      mergeSchema({ allOf: [target, branchSchema] }),
      branchSchema,
      siblingBranchSchema,
      baseRequired,
    );
    Object.keys(target).forEach((k) => delete target[k]);
    Object.assign(target, merged);
  }
  return buildExampleFromSchema(schemaVariant);
};

export function schemaToExamples(rootSchema) {
  const choicePoints = findChoicePoints(rootSchema);
  const conditionalPoints = findConditionalPoints(rootSchema);

  if (choicePoints.length === 0 && conditionalPoints.length === 0) {
    const example = buildExampleFromSchema(rootSchema);
    if (typeof example !== 'undefined') {
      const shouldIncludeObjectExample =
        typeof example !== 'object' ||
        example === null ||
        Object.keys(example).length > 0;

      if (shouldIncludeObjectExample) {
        return [
          { property: 'default', options: [{ title: 'Example', example }] },
        ];
      }
    }
    return [];
  }

  const choiceExamples = choicePoints.map(({ path, schema }) => {
    const choiceType = schema.oneOf ? 'oneOf' : 'anyOf';
    const propertyName = path.length > 0 ? path[path.length - 1] : 'root';

    const options = schema[choiceType].map((option) => ({
      title: option.title || 'Option',
      example: generateExampleForChoice(rootSchema, path, option),
    }));

    return { property: propertyName, options };
  });

  const conditionalExamples = conditionalPoints.map(({ path, schema }) => {
    const options = [];

    if (schema.then) {
      options.push({
        title: 'When condition is met',
        example: generateConditionalExample(rootSchema, path, 'then'),
      });
    }
    if (schema.else) {
      options.push({
        title: 'When condition is not met',
        example: generateConditionalExample(rootSchema, path, 'else'),
      });
    }

    return { property: 'conditional', options };
  });

  return [...choiceExamples, ...conditionalExamples];
}
