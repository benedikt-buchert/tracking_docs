import { getConstraints } from './getConstraints';

function processOptions(
  choices,
  level,
  path,
  isNestedInProperty,
  requiredArray = [],
) {
  return choices.map((optionSchema) => {
    const optionTitle = optionSchema.title || 'Option';
    let optionRows = [];

    // This is a primitive type (string, number, etc.) within a choice
    if (optionSchema.type && !optionSchema.properties) {
      const isRequired = requiredArray.includes(path[path.length - 1]);
      const constraints = getConstraints(optionSchema);
      if (isRequired) {
        constraints.unshift('required');
      }

      optionRows.push({
        type: 'property',
        // The name of the property is the name of the parent property that holds the choice
        name: path.length > 0 ? path[path.length - 1] : optionTitle,
        path: [...path, `(${optionTitle})`],
        // If it's a top-level choice (like user_id), the level is the same as the choice itself.
        // Otherwise, it's nested.
        level: level,
        required: isRequired,
        propertyType: optionSchema.type,
        description: optionSchema.description,
        example: optionSchema.examples || optionSchema.example,
        constraints: constraints,
        isLastInGroup: true,
      });
    } else {
      // This is a complex object within a choice
      optionRows = schemaToTableData(
        optionSchema,
        // If nested in a property (like payment_method), the sub-properties start at the same level as the choice
        // Otherwise, they are one level deeper.
        level,
        isNestedInProperty ? [] : path,
      );
    }

    return {
      title: optionTitle,
      description: optionSchema.description,
      rows: optionRows,
    };
  });
}

export function schemaToTableData(schema, level = 0, path = []) {
  const flatRows = [];

  function isEffectivelyEmpty(schemaNode) {
    if (
      schemaNode.type !== 'object' &&
      typeof schemaNode.properties === 'undefined'
    ) {
      return false;
    }
    if (schemaNode.oneOf || schemaNode.anyOf) {
      return false;
    }
    if (
      !schemaNode.properties ||
      Object.keys(schemaNode.properties).length === 0
    ) {
      return true;
    }
    return Object.values(schemaNode.properties).every(isEffectivelyEmpty);
  }

  function buildRows(
    subSchema,
    currentLevel,
    currentPath,
    requiredFromParent = [],
  ) {
    if (!subSchema) return;

    if (subSchema.properties) {
      const propKeys = Object.keys(subSchema.properties);
      const hasSiblingChoices = !!(subSchema.oneOf || subSchema.anyOf);

      propKeys.forEach((name, index) => {
        const propSchema = subSchema.properties[name];
        const newPath = [...currentPath, name];

        if (
          propSchema['x-gtm-clear'] === true &&
          isEffectivelyEmpty(propSchema)
        ) {
          return;
        }

        const isLast = index === propKeys.length - 1 && !hasSiblingChoices;
        const isChoiceWrapper = !!(propSchema.oneOf || propSchema.anyOf);

        // This is a "simple" choice property like user_id.
        // It gets unwrapped into a choice row directly.
        if (
          isChoiceWrapper &&
          !propSchema.properties &&
          propSchema.type !== 'object'
        ) {
          const choiceType = propSchema.oneOf ? 'oneOf' : 'anyOf';
          const choices = propSchema[choiceType];
          flatRows.push({
            type: 'choice',
            choiceType,
            path: newPath,
            level: currentLevel,
            title: propSchema.title,
            description: propSchema.description,
            isLastInGroup: isLast,
            options: processOptions(
              choices,
              currentLevel,
              newPath,
              false,
              subSchema.required || requiredFromParent,
            ),
          });
        } else {
          // This is a "normal" property or a complex one with a nested choice.
          const isRequired =
            (subSchema.required || requiredFromParent)?.includes(name) || false;
          const constraints = getConstraints(propSchema);
          if (isRequired) {
            constraints.unshift('required');
          }

          const hasNestedChoice = isChoiceWrapper;
          const hasNestedProperties =
            !!propSchema.properties ||
            (propSchema.type === 'array' && propSchema.items?.properties);

          flatRows.push({
            type: 'property',
            name,
            path: newPath,
            level: currentLevel,
            required: isRequired,
            propertyType:
              propSchema.type || (propSchema.enum ? 'enum' : 'object'),
            description: propSchema.description,
            example: propSchema.examples || propSchema.example,
            constraints,
            isLastInGroup: isLast && !hasNestedChoice && !hasNestedProperties,
          });

          if (propSchema.properties) {
            buildRows(
              propSchema,
              currentLevel + 1,
              newPath,
              propSchema.required,
            );
          } else if (
            propSchema.type === 'array' &&
            propSchema.items?.properties
          ) {
            buildRows(
              propSchema.items,
              currentLevel + 1,
              [...newPath, '[n]'],
              propSchema.items.required,
            );
          } else if (isChoiceWrapper) {
            // This handles the "complex" choice property like payment_method.
            // A property row has already been created above, now we add the choice row.
            const choiceType = propSchema.oneOf ? 'oneOf' : 'anyOf';
            const choices = propSchema[choiceType];
            flatRows.push({
              type: 'choice',
              choiceType,
              path: [...newPath, choiceType], // Make path unique
              level: currentLevel + 1,
              title: propSchema.title,
              description: null,
              isLastInGroup: true,
              options: processOptions(
                choices,
                currentLevel + 1,
                newPath,
                true,
                propSchema.required,
              ),
            });
          }
        }
      });
    }

    // This handles choices at the root of a schema
    const choiceType = subSchema.oneOf
      ? 'oneOf'
      : subSchema.anyOf
        ? 'anyOf'
        : null;
    if (choiceType) {
      const choices = subSchema[choiceType];
      flatRows.push({
        type: 'choice',
        choiceType,
        path: currentPath,
        level: currentLevel,
        title: subSchema.title,
        description: subSchema.description,
        isLastInGroup: true,
        options: processOptions(
          choices,
          currentLevel,
          currentPath,
          false,
          subSchema.required || requiredFromParent,
        ),
      });
    } else if (!subSchema.properties && subSchema.type) {
      // This handles a schema that is just a single primitive type
      flatRows.push({
        type: 'property',
        name: subSchema.title || '<value>',
        path: currentPath,
        level: currentLevel,
        required: false,
        propertyType: subSchema.type,
        description: subSchema.description,
        example: subSchema.examples || subSchema.example,
        constraints: getConstraints(subSchema),
        isLastInGroup: true,
      });
    }
  }

  buildRows(schema, level, path, schema.required);
  return flatRows;
}
