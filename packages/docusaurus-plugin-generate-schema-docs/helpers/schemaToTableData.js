import { getConstraints } from './getConstraints';

function getExample(propSchema) {
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

function processOptions(
  choices,
  level,
  path,
  isNestedInProperty,
  requiredArray = [],
  continuingLevels = [],
) {
  return choices.map((optionSchema, index) => {
    const optionTitle = optionSchema.title || 'Option';

    // Determine if this is the last option in the list.
    // If it is NOT the last option, its children must not close the visual tree branch.
    const isLastOption = index === choices.length - 1;

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
        example: getExample(optionSchema),
        constraints: constraints,
        isLastInGroup: isLastOption, // Updated: Uses the calculated flag instead of always true
        hasChildren: false,
        containerType: null,
        continuingLevels: [...continuingLevels],
      });
    } else {
      // This is a complex object within a choice
      optionRows = schemaToTableData(
        optionSchema,
        // If nested in a property (like payment_method), the sub-properties start at the same level as the choice
        // Otherwise, they are one level deeper.
        level,
        isNestedInProperty ? [] : path,
        continuingLevels,
        isLastOption,
      );
    }

    return {
      title: optionTitle,
      description: optionSchema.description,
      rows: optionRows,
    };
  });
}

export function schemaToTableData(
  schema,
  level = 0,
  path = [],
  parentContinuingLevels = [],
  isLastOption = true,
) {
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
    continuingLevels = [],
  ) {
    if (!subSchema) return;

    if (subSchema.properties) {
      const propKeys = Object.keys(subSchema.properties);
      const hasSiblingChoices = !!(subSchema.oneOf || subSchema.anyOf);

      // Filter out properties that should be skipped to get accurate count
      const visiblePropKeys = propKeys.filter((name) => {
        const propSchema = subSchema.properties[name];
        return !(
          propSchema['x-gtm-clear'] === true && isEffectivelyEmpty(propSchema)
        );
      });

      visiblePropKeys.forEach((name, index) => {
        const propSchema = subSchema.properties[name];
        const newPath = [...currentPath, name];

        const isLastProp =
          index === visiblePropKeys.length - 1 && !hasSiblingChoices;

        // Updated Logic:
        // A property is visually "last" only if it is the last property
        // AND (it is deeper in the hierarchy OR the parent option itself is the last one).
        const isLast = isLastProp && (currentLevel !== level || isLastOption);

        const isChoiceWrapper = !!(propSchema.oneOf || propSchema.anyOf);

        // Determine if this property has children and what type
        const hasNestedProperties = !!propSchema.properties;
        const hasArrayItems =
          propSchema.type === 'array' && !!propSchema.items?.properties;
        const hasNestedChoice = isChoiceWrapper;
        const hasChildren =
          hasNestedProperties || hasArrayItems || hasNestedChoice;

        // Determine container type for the symbol
        let containerType = null;
        if (
          hasNestedProperties ||
          (isChoiceWrapper && propSchema.type === 'object')
        ) {
          containerType = 'object';
        } else if (hasArrayItems) {
          containerType = 'array';
        }

        // Calculate continuing levels for children
        // If this is not the last item, add current level to continuing levels for children
        // If this IS the last item, remove the immediate parent level (currentLevel - 1) because
        // that line stops at this item and should not continue through its children
        const childContinuingLevels = isLast
          ? continuingLevels.filter((lvl) => lvl !== currentLevel - 1)
          : [...continuingLevels, currentLevel];

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
            hasChildren: false,
            containerType: null,
            continuingLevels: [...continuingLevels],
            options: processOptions(
              choices,
              currentLevel,
              newPath,
              false,
              subSchema.required || requiredFromParent,
              childContinuingLevels,
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

          flatRows.push({
            type: 'property',
            name,
            path: newPath,
            level: currentLevel,
            required: isRequired,
            propertyType:
              propSchema.type || (propSchema.enum ? 'enum' : 'object'),
            description: propSchema.description,
            example: getExample(propSchema),
            constraints,
            isLastInGroup: isLast,
            hasChildren,
            containerType,
            continuingLevels: [...continuingLevels],
          });

          if (propSchema.properties) {
            buildRows(
              propSchema,
              currentLevel + 1,
              newPath,
              propSchema.required,
              childContinuingLevels,
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
              childContinuingLevels,
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
              hasChildren: false,
              containerType: null,
              continuingLevels: childContinuingLevels,
              options: processOptions(
                choices,
                currentLevel + 1,
                newPath,
                true,
                propSchema.required,
                childContinuingLevels,
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
        hasChildren: false,
        containerType: null,
        continuingLevels: [...continuingLevels],
        options: processOptions(
          choices,
          currentLevel,
          currentPath,
          false,
          subSchema.required || requiredFromParent,
          continuingLevels,
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
        example: getExample(subSchema),
        constraints: getConstraints(subSchema),
        isLastInGroup: true,
        hasChildren: false,
        containerType: null,
        continuingLevels: [...continuingLevels],
      });
    }
  }

  buildRows(schema, level, path, schema.required, parentContinuingLevels);
  return flatRows;
}
