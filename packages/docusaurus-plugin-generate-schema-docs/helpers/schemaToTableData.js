import { getConstraints } from './getConstraints';
import { getExamples } from './example-helper';

/**
 * Computes the bracket descriptor for a new group being opened at `level`.
 * `bracketIndex` is the total number of existing parent brackets, so each
 * nested group gets a unique visual position on the right side.
 */
function computeOwnBracket(level, parentGroupBrackets) {
  const bracketIndex = parentGroupBrackets.length;
  return { level, bracketIndex };
}

function processOptions(
  choices,
  level,
  path,
  isNestedInProperty,
  requiredArray = [],
  continuingLevels = [],
  groupBrackets = [],
  choiceIsLastInGroup = true,
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
        examples: getExamples(optionSchema),
        constraints: constraints,
        // Keep connector lines open when the enclosing choice block isn't truly last.
        isLastInGroup: isLastOption && choiceIsLastInGroup,
        hasChildren: false,
        containerType: null,
        continuingLevels: [...continuingLevels],
        groupBrackets: [...groupBrackets],
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
        isLastOption && choiceIsLastInGroup,
        groupBrackets,
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
  parentGroupBrackets = [],
) {
  const flatRows = [];

  function isEffectivelyEmpty(schemaNode) {
    if (
      schemaNode.type !== 'object' &&
      typeof schemaNode.properties === 'undefined'
    ) {
      return false;
    }
    if (schemaNode.oneOf || schemaNode.anyOf || schemaNode.if) {
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

  function buildConditionalRow(
    subSchema,
    currentLevel,
    currentPath,
    continuingLevels,
    currentGroupBrackets = [],
    ownContinuingLevels,
    conditionalIsLastInGroup = true,
  ) {
    // Inner rows (condition, branches) inherit the parent's continuingLevels.
    // The immediate parent connector (currentLevel - 1) is handled by the
    // ConditionalRows component via its ancestorLevels.push(level - 1).
    const innerContinuingLevels = [...continuingLevels];

    // Compute the bracket for this if/then/else group
    const ownBracket = computeOwnBracket(currentLevel, currentGroupBrackets);
    const innerGroupBrackets = [...currentGroupBrackets, ownBracket];

    const conditionRows = schemaToTableData(
      subSchema.if,
      currentLevel,
      currentPath,
      innerContinuingLevels,
      false, // branches always follow condition rows, so they are never "last"
      innerGroupBrackets,
    ).map((row) => ({ ...row, isCondition: true }));

    const hasThen = !!subSchema.then;
    const hasElse = !!subSchema.else;

    const branches = [];
    if (hasThen) {
      // Then is NOT the last branch if Else exists — use innerContinuingLevels
      // to keep the parent line flowing. If Then IS the last branch, use original.
      const thenLevels = hasElse ? innerContinuingLevels : continuingLevels;
      branches.push({
        title: 'Then',
        description: subSchema.then.description,
        rows: schemaToTableData(
          subSchema.then,
          currentLevel,
          currentPath,
          thenLevels,
          // Keep branch connectors open if this conditional block isn't truly last.
          !hasElse && conditionalIsLastInGroup,
          innerGroupBrackets,
        ),
      });
    }
    if (hasElse) {
      // Else is always the last branch — use original continuingLevels
      branches.push({
        title: 'Else',
        description: subSchema.else.description,
        rows: schemaToTableData(
          subSchema.else,
          currentLevel,
          currentPath,
          continuingLevels,
          conditionalIsLastInGroup,
          innerGroupBrackets,
        ),
      });
    }

    // ownContinuingLevels (when provided) includes currentLevel for the row's
    // header/toggle rendering, since sibling properties' tree lines must continue.
    // Merge with innerContinuingLevels to also include the parent level.
    const rowContinuingLevels = ownContinuingLevels
      ? [...new Set([...innerContinuingLevels, ...ownContinuingLevels])]
      : innerContinuingLevels;

    flatRows.push({
      type: 'conditional',
      path: [...currentPath, 'if/then/else'],
      level: currentLevel,
      isLastInGroup: conditionalIsLastInGroup,
      hasChildren: false,
      containerType: null,
      continuingLevels: [...rowContinuingLevels],
      groupBrackets: [...currentGroupBrackets],
      condition: {
        title: 'If',
        description: subSchema.if.description,
        rows: conditionRows,
      },
      branches,
    });
  }

  function buildRows(
    subSchema,
    currentLevel,
    currentPath,
    requiredFromParent = [],
    continuingLevels = [],
    currentGroupBrackets = [],
  ) {
    if (!subSchema) return;

    if (subSchema.properties) {
      const propKeys = Object.keys(subSchema.properties);
      const hasSiblingChoices = !!(
        subSchema.oneOf ||
        subSchema.anyOf ||
        subSchema.if
      );

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
        const isConditionalWrapper = !!(
          propSchema.if &&
          (propSchema.then || propSchema.else)
        );

        // Determine if this property has children and what type
        const hasNestedProperties = !!propSchema.properties;
        const hasArrayItems =
          propSchema.type === 'array' &&
          !!(propSchema.items?.properties || propSchema.items?.if);
        const hasNestedChoice = isChoiceWrapper;
        const hasNestedConditional = isConditionalWrapper;
        const hasChildren =
          hasNestedProperties ||
          hasArrayItems ||
          hasNestedChoice ||
          hasNestedConditional;

        // Determine container type for the symbol
        let containerType = null;
        const choiceOptions = propSchema.oneOf || propSchema.anyOf || [];
        const choiceOptionsAreObjects =
          isChoiceWrapper &&
          choiceOptions.some((opt) => opt.type === 'object' || opt.properties);
        if (
          hasNestedProperties ||
          (isChoiceWrapper && propSchema.type === 'object') ||
          (isConditionalWrapper && propSchema.type === 'object') ||
          choiceOptionsAreObjects
        ) {
          containerType = 'object';
        } else if (hasArrayItems) {
          containerType = 'array';
        }

        // Calculate continuing levels for children
        // If this is not the last item, add current level to continuing levels for children
        // If this IS the last item, don't add currentLevel (no more siblings at this level).
        // We keep all existing continuingLevels intact — they represent ancestor lines
        // that must continue through all descendants regardless of last-child status.
        const childContinuingLevels = isLast
          ? [...continuingLevels]
          : [...continuingLevels, currentLevel];

        // A "simple" choice property like user_id: { oneOf: [{ type: "string" }, { type: "integer" }] }
        // where the options are scalar types (no nested properties). These get unwrapped
        // into a choice row directly without their own property row.
        // In contrast, choice wrappers whose options are objects with properties
        // (like contact_method) need their own property row to start a nesting level.
        const isSimpleChoice =
          isChoiceWrapper &&
          !propSchema.properties &&
          propSchema.type !== 'object' &&
          !(propSchema.oneOf || propSchema.anyOf).some((opt) => opt.properties);

        if (isSimpleChoice) {
          const choiceType = propSchema.oneOf ? 'oneOf' : 'anyOf';
          const choices = propSchema[choiceType];
          const ownBracket = computeOwnBracket(
            currentLevel,
            currentGroupBrackets,
          );
          const innerGroupBrackets = [...currentGroupBrackets, ownBracket];
          flatRows.push({
            type: 'choice',
            choiceType,
            name,
            path: newPath,
            level: currentLevel,
            title: propSchema.title,
            description: propSchema.description,
            isLastInGroup: isLast,
            hasChildren: false,
            containerType: null,
            continuingLevels: [...continuingLevels],
            groupBrackets: [...currentGroupBrackets],
            options: processOptions(
              choices,
              currentLevel,
              newPath,
              false,
              subSchema.required || requiredFromParent,
              childContinuingLevels,
              innerGroupBrackets,
              isLast,
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
            examples: getExamples(propSchema),
            constraints,
            isLastInGroup: isLast,
            hasChildren,
            containerType,
            continuingLevels: [...continuingLevels],
            groupBrackets: [...currentGroupBrackets],
          });

          if (propSchema.properties) {
            buildRows(
              propSchema,
              currentLevel + 1,
              newPath,
              propSchema.required,
              childContinuingLevels,
              currentGroupBrackets,
            );
          } else if (
            propSchema.type === 'array' &&
            (propSchema.items?.properties || propSchema.items?.if)
          ) {
            if (propSchema.items.properties) {
              buildRows(
                propSchema.items,
                currentLevel + 1,
                [...newPath, '[n]'],
                propSchema.items.required,
                childContinuingLevels,
                currentGroupBrackets,
              );
            }
            // Handle if/then/else inside array items
            if (
              propSchema.items.if &&
              (propSchema.items.then || propSchema.items.else)
            ) {
              buildConditionalRow(
                propSchema.items,
                currentLevel + 1,
                [...newPath, '[n]'],
                childContinuingLevels,
                currentGroupBrackets,
                undefined,
                isLast,
              );
            }
          } else if (isChoiceWrapper) {
            // This handles the "complex" choice property like payment_method.
            // A property row has already been created above, now we add the choice row.
            const choiceType = propSchema.oneOf ? 'oneOf' : 'anyOf';
            const choices = propSchema[choiceType];
            const complexOwnBracket = computeOwnBracket(
              currentLevel + 1,
              currentGroupBrackets,
            );
            const complexInnerBrackets = [
              ...currentGroupBrackets,
              complexOwnBracket,
            ];
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
              groupBrackets: [...currentGroupBrackets],
              options: processOptions(
                choices,
                currentLevel + 1,
                newPath,
                true,
                propSchema.required,
                childContinuingLevels,
                complexInnerBrackets,
              ),
            });
          }

          // Handle if/then/else nested inside a property without its own properties.
          // When propSchema HAS properties, the recursive buildRows call above
          // already handles if/then/else via the root-level check at the end of buildRows.
          if (isConditionalWrapper && !propSchema.properties) {
            buildConditionalRow(
              propSchema,
              currentLevel + 1,
              newPath,
              childContinuingLevels,
              currentGroupBrackets,
              undefined,
              isLast,
            );
          }
        }
      });
    }

    // When properties coexist with root-level choices or conditionals,
    // the header/toggle rows need the tree line at currentLevel to continue.
    // Only used for the row's own continuingLevels — NOT propagated to inner rows.
    const hasProperties =
      subSchema.properties && Object.keys(subSchema.properties).length > 0;
    const ownContinuingLevels =
      hasProperties && !continuingLevels.includes(currentLevel)
        ? [...continuingLevels, currentLevel]
        : [...continuingLevels];

    // This handles choices at the root of a schema
    const choiceType = subSchema.oneOf
      ? 'oneOf'
      : subSchema.anyOf
        ? 'anyOf'
        : null;
    if (choiceType) {
      const choices = subSchema[choiceType];
      const ownBracket = computeOwnBracket(currentLevel, currentGroupBrackets);
      const innerGroupBrackets = [...currentGroupBrackets, ownBracket];
      const choiceIsLastInGroup =
        isLastOption && !(subSchema.if && (subSchema.then || subSchema.else));
      flatRows.push({
        type: 'choice',
        choiceType,
        path: currentPath,
        level: currentLevel,
        title: subSchema.title,
        description: subSchema.description,
        isLastInGroup: choiceIsLastInGroup,
        hasChildren: false,
        containerType: null,
        continuingLevels: [...ownContinuingLevels],
        groupBrackets: [...currentGroupBrackets],
        options: processOptions(
          choices,
          currentLevel,
          currentPath,
          false,
          subSchema.required || requiredFromParent,
          continuingLevels,
          innerGroupBrackets,
          choiceIsLastInGroup,
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
        examples: getExamples(subSchema),
        constraints: getConstraints(subSchema),
        isLastInGroup: true,
        hasChildren: false,
        containerType: null,
        continuingLevels: [...continuingLevels],
        groupBrackets: [...currentGroupBrackets],
      });
    }

    // Handle if/then/else at the schema root (or sub-schema root)
    if (subSchema.if && (subSchema.then || subSchema.else)) {
      // ownContinuingLevels includes currentLevel for the row's header/toggle rendering.
      // Inner rows (condition, branches) use the original continuingLevels.
      buildConditionalRow(
        subSchema,
        currentLevel,
        currentPath,
        continuingLevels,
        currentGroupBrackets,
        hasProperties ? [...ownContinuingLevels] : undefined,
        isLastOption,
      );
    }
  }

  buildRows(
    schema,
    level,
    path,
    schema.required,
    parentContinuingLevels,
    parentGroupBrackets,
  );
  return flatRows;
}
