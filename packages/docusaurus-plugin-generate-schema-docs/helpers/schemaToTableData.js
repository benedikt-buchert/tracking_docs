import { getConstraints } from './getConstraints';
import { getExamples } from './example-helper';

/**
 * Computes the bracket descriptor for a new group being opened at `level`.
 * `bracketIndex` is the total number of existing parent brackets, so each
 * nested group gets a unique visual position on the right side.
 */
function computeOwnBracket(level, parentGroupBrackets) {
  return { level, bracketIndex: parentGroupBrackets.length };
}

function materializeConditionalBranchSchema(branchSchema, parentSchema) {
  if (
    !branchSchema ||
    branchSchema.properties ||
    branchSchema.oneOf ||
    branchSchema.anyOf ||
    branchSchema.if ||
    !Array.isArray(branchSchema.required) ||
    !parentSchema?.properties
  ) {
    return branchSchema;
  }

  const branchProperties = Object.fromEntries(
    branchSchema.required
      .filter((name) => parentSchema.properties[name])
      .map((name) => [name, parentSchema.properties[name]]),
  );

  return Object.keys(branchProperties).length === 0
    ? branchSchema
    : { ...branchSchema, type: 'object', properties: branchProperties };
}

function hasRenderableAdditionalProperties(schemaNode) {
  return !!(
    schemaNode?.additionalProperties &&
    typeof schemaNode.additionalProperties === 'object' &&
    !Array.isArray(schemaNode.additionalProperties)
  );
}

function getRenderablePatternProperties(schemaNode) {
  if (!schemaNode?.patternProperties) return [];
  return Object.entries(schemaNode.patternProperties)
    .filter(([, s]) => s && typeof s === 'object' && !Array.isArray(s))
    .map(([pattern, s]) => [
      `patternProperties /${pattern}/`,
      { ...s, 'x-schema-keyword-row': true },
    ]);
}

function isEffectivelyEmpty(schemaNode) {
  if (
    schemaNode.type !== 'object' &&
    typeof schemaNode.properties === 'undefined'
  ) {
    return false;
  }
  if (schemaNode.oneOf || schemaNode.anyOf || schemaNode.if) return false;
  if (!schemaNode.properties || Object.keys(schemaNode.properties).length === 0)
    return true;
  return Object.values(schemaNode.properties).every(isEffectivelyEmpty);
}

// --- Step 4: extracted containerType resolution ---
function resolveContainerType(
  propSchema,
  {
    hasNestedProperties,
    hasAdditionalProperties,
    hasArrayItems,
    isChoiceWrapper,
    isConditionalWrapper,
    choiceOptionsAreObjects,
  },
) {
  if (hasNestedProperties || hasAdditionalProperties) return 'object';
  if (
    isChoiceWrapper &&
    (propSchema.type === 'object' || choiceOptionsAreObjects)
  )
    return 'object';
  if (isConditionalWrapper && propSchema.type === 'object') return 'object';
  if (hasArrayItems) return 'array';
  return null;
}

/**
 * Returns whether a property schema has children and what container type it renders as.
 * Also returns flags used for child-building dispatch.
 */
function getContainerInfo(propSchema) {
  const isChoiceWrapper = !!(propSchema.oneOf || propSchema.anyOf);
  const isConditionalWrapper = !!(
    propSchema.if &&
    (propSchema.then || propSchema.else)
  );
  const hasNestedProperties = !!propSchema.properties;
  const hasAdditionalProperties = hasRenderableAdditionalProperties(propSchema);
  const hasArrayItems =
    propSchema.type === 'array' &&
    !!(propSchema.items?.properties || propSchema.items?.if);
  const choiceOptionsAreObjects =
    isChoiceWrapper &&
    (propSchema.oneOf || propSchema.anyOf).some(
      (opt) => opt.type === 'object' || opt.properties,
    );

  const hasChildren =
    hasNestedProperties ||
    hasAdditionalProperties ||
    hasArrayItems ||
    isChoiceWrapper ||
    isConditionalWrapper;

  const containerType = resolveContainerType(propSchema, {
    hasNestedProperties,
    hasAdditionalProperties,
    hasArrayItems,
    isChoiceWrapper,
    isConditionalWrapper,
    choiceOptionsAreObjects,
  });

  return {
    hasChildren,
    containerType,
    isChoiceWrapper,
    isConditionalWrapper,
    hasArrayItems,
    hasAdditionalProperties,
  };
}

// --- Step 1: Row factory functions ---
function makeBaseRow(overrides) {
  return {
    hasChildren: false,
    containerType: null,
    ...overrides,
  };
}

function makePropertyRow(fields) {
  return makeBaseRow({ type: 'property', ...fields });
}

function makeChoiceRow(fields) {
  return makeBaseRow({ type: 'choice', ...fields });
}

function makeConditionalRow(fields) {
  return makeBaseRow({ type: 'conditional', ...fields });
}

// --- Step 2: buildPropEntries helper ---
function buildPropEntries(subSchema, patternPropertyEntries) {
  const entries = subSchema.properties
    ? Object.entries(subSchema.properties)
    : [];
  if (hasRenderableAdditionalProperties(subSchema)) {
    entries.push([
      'additionalProperties',
      { ...subSchema.additionalProperties, 'x-schema-keyword-row': true },
    ]);
  }
  entries.push(...patternPropertyEntries);
  return entries;
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
    const isLast = index === choices.length - 1 && choiceIsLastInGroup;

    let rows;
    if (optionSchema.type && !optionSchema.properties) {
      // Primitive type within a choice
      const isRequired = requiredArray.includes(path[path.length - 1]);
      const constraints = getConstraints(optionSchema);
      if (isRequired) constraints.unshift('required');
      rows = [
        makePropertyRow({
          name: path.length > 0 ? path[path.length - 1] : optionTitle,
          path: [...path, `(${optionTitle})`],
          level,
          required: isRequired,
          propertyType: optionSchema.type,
          description: optionSchema.description,
          examples: getExamples(optionSchema),
          constraints,
          isLastInGroup: isLast,
          continuingLevels: [...continuingLevels],
          groupBrackets: [...groupBrackets],
        }),
      ];
    } else {
      rows = schemaToTableData(
        optionSchema,
        level,
        isNestedInProperty ? [] : path,
        continuingLevels,
        isLast,
        groupBrackets,
      );
    }

    return { title: optionTitle, description: optionSchema.description, rows };
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

  function buildConditionalRow(
    subSchema,
    currentLevel,
    currentPath,
    continuingLevels,
    currentGroupBrackets = [],
    ownContinuingLevels,
    conditionalIsLastInGroup = true,
  ) {
    const ownBracket = computeOwnBracket(currentLevel, currentGroupBrackets);
    const innerGroupBrackets = [...currentGroupBrackets, ownBracket];

    const conditionRows = schemaToTableData(
      subSchema.if,
      currentLevel,
      currentPath,
      continuingLevels,
      false, // branches always follow condition rows, so they are never "last"
      innerGroupBrackets,
    ).map((row) => ({ ...row, isCondition: true }));

    const hasElse = !!subSchema.else;
    const branches = [];

    if (subSchema.then) {
      branches.push({
        title: 'Then',
        description: subSchema.then.description,
        rows: schemaToTableData(
          materializeConditionalBranchSchema(subSchema.then, subSchema),
          currentLevel,
          currentPath,
          continuingLevels,
          !hasElse && conditionalIsLastInGroup,
          innerGroupBrackets,
        ),
      });
    }

    if (hasElse) {
      branches.push({
        title: 'Else',
        description: subSchema.else.description,
        rows: schemaToTableData(
          materializeConditionalBranchSchema(subSchema.else, subSchema),
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
    const rowContinuingLevels = ownContinuingLevels
      ? [...new Set([...continuingLevels, ...ownContinuingLevels])]
      : continuingLevels;

    flatRows.push(
      makeConditionalRow({
        path: [...currentPath, 'if/then/else'],
        level: currentLevel,
        isLastInGroup: conditionalIsLastInGroup,
        continuingLevels: [...rowContinuingLevels],
        groupBrackets: [...currentGroupBrackets],
        condition: {
          title: 'If',
          description: subSchema.if.description,
          rows: conditionRows,
        },
        branches,
      }),
    );
  }

  // Dispatches child row building after a property row has been pushed.
  function buildPropertyChildren(
    propSchema,
    currentLevel,
    newPath,
    childContinuingLevels,
    currentGroupBrackets,
    isLast,
    {
      isChoiceWrapper,
      isConditionalWrapper,
      hasArrayItems,
      hasAdditionalProperties,
    },
  ) {
    if (propSchema.properties) {
      buildRows(
        propSchema,
        currentLevel + 1,
        newPath,
        propSchema.required,
        childContinuingLevels,
        currentGroupBrackets,
      );
    } else if (propSchema.type === 'object' && hasAdditionalProperties) {
      buildRows(
        propSchema,
        currentLevel + 1,
        newPath,
        [],
        childContinuingLevels,
        currentGroupBrackets,
      );
    } else if (hasArrayItems) {
      const itemPath = [...newPath, '[n]'];
      if (propSchema.items.properties) {
        buildRows(
          propSchema.items,
          currentLevel + 1,
          itemPath,
          propSchema.items.required,
          childContinuingLevels,
          currentGroupBrackets,
        );
      }
      if (
        propSchema.items.if &&
        (propSchema.items.then || propSchema.items.else)
      ) {
        buildConditionalRow(
          propSchema.items,
          currentLevel + 1,
          itemPath,
          childContinuingLevels,
          currentGroupBrackets,
          undefined,
          isLast,
        );
      }
    } else if (isChoiceWrapper) {
      // Complex choice property (e.g. payment_method): property row already pushed,
      // now add the nested choice row.
      const choiceType = propSchema.oneOf ? 'oneOf' : 'anyOf';
      const ownBracket = computeOwnBracket(
        currentLevel + 1,
        currentGroupBrackets,
      );
      const innerBrackets = [...currentGroupBrackets, ownBracket];
      flatRows.push(
        makeChoiceRow({
          choiceType,
          path: [...newPath, choiceType],
          level: currentLevel + 1,
          title: propSchema.title,
          description: null,
          isLastInGroup: true,
          continuingLevels: childContinuingLevels,
          groupBrackets: [...currentGroupBrackets],
          options: processOptions(
            propSchema[choiceType],
            currentLevel + 1,
            newPath,
            true,
            propSchema.required,
            childContinuingLevels,
            innerBrackets,
          ),
        }),
      );
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

  // --- Step 3: extracted property iteration ---
  function buildPropertyRows(
    subSchema,
    currentLevel,
    currentPath,
    requiredFromParent,
    continuingLevels,
    currentGroupBrackets,
    visiblePropEntries,
    hasSiblingChoices,
  ) {
    visiblePropEntries.forEach(([name, propSchema], index) => {
      const newPath = [...currentPath, name];
      const isLastProp =
        index === visiblePropEntries.length - 1 && !hasSiblingChoices;
      const isLast = isLastProp && (currentLevel !== level || isLastOption);

      // If this is not the last item, add currentLevel to continuing levels for children
      // so ancestor tree lines keep flowing through all descendants.
      const childContinuingLevels = isLast
        ? [...continuingLevels]
        : [...continuingLevels, currentLevel];

      const {
        hasChildren,
        containerType,
        isChoiceWrapper,
        isConditionalWrapper,
        hasArrayItems,
        hasAdditionalProperties,
      } = getContainerInfo(propSchema);

      // A "simple" choice has scalar options (no nested properties) and renders inline.
      // A "complex" choice has object options and needs its own property row first.
      const isSimpleChoice = isChoiceWrapper && containerType === null;

      if (isSimpleChoice) {
        const choiceType = propSchema.oneOf ? 'oneOf' : 'anyOf';
        const ownBracket = computeOwnBracket(
          currentLevel,
          currentGroupBrackets,
        );
        flatRows.push(
          makeChoiceRow({
            choiceType,
            name,
            path: newPath,
            level: currentLevel,
            title: propSchema.title,
            description: propSchema.description,
            isLastInGroup: isLast,
            continuingLevels: [...continuingLevels],
            groupBrackets: [...currentGroupBrackets],
            options: processOptions(
              propSchema[choiceType],
              currentLevel,
              newPath,
              false,
              subSchema.required || requiredFromParent,
              childContinuingLevels,
              [...currentGroupBrackets, ownBracket],
              isLast,
            ),
          }),
        );
      } else {
        const isRequired =
          (subSchema.required || requiredFromParent)?.includes(name) || false;
        const constraints = getConstraints(propSchema);
        if (isRequired) constraints.unshift('required');

        flatRows.push(
          makePropertyRow({
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
            isSchemaKeywordRow: propSchema['x-schema-keyword-row'] === true,
            keepConnectorOpen: propSchema['x-keep-connector-open'] === true,
          }),
        );

        buildPropertyChildren(
          propSchema,
          currentLevel,
          newPath,
          childContinuingLevels,
          currentGroupBrackets,
          isLast,
          {
            isChoiceWrapper,
            isConditionalWrapper,
            hasArrayItems,
            hasAdditionalProperties,
          },
        );
      }
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

    const patternPropertyEntries = getRenderablePatternProperties(subSchema);
    const hasAnyProperties =
      subSchema.properties ||
      hasRenderableAdditionalProperties(subSchema) ||
      patternPropertyEntries.length > 0;

    if (hasAnyProperties) {
      const propEntries = buildPropEntries(subSchema, patternPropertyEntries);
      const hasSiblingChoices = !!(
        subSchema.oneOf ||
        subSchema.anyOf ||
        subSchema.if
      );
      const visiblePropEntries = propEntries.filter(
        ([, propSchema]) =>
          !(
            propSchema['x-gtm-clear'] === true && isEffectivelyEmpty(propSchema)
          ),
      );

      buildPropertyRows(
        subSchema,
        currentLevel,
        currentPath,
        requiredFromParent,
        continuingLevels,
        currentGroupBrackets,
        visiblePropEntries,
        hasSiblingChoices,
      );
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

    const choiceType = subSchema.oneOf
      ? 'oneOf'
      : subSchema.anyOf
        ? 'anyOf'
        : null;
    if (choiceType) {
      const ownBracket = computeOwnBracket(currentLevel, currentGroupBrackets);
      const choiceIsLastInGroup =
        isLastOption && !(subSchema.if && (subSchema.then || subSchema.else));
      flatRows.push(
        makeChoiceRow({
          choiceType,
          path: currentPath,
          level: currentLevel,
          title: subSchema.title,
          description: subSchema.description,
          isLastInGroup: choiceIsLastInGroup,
          continuingLevels: [...ownContinuingLevels],
          groupBrackets: [...currentGroupBrackets],
          options: processOptions(
            subSchema[choiceType],
            currentLevel,
            currentPath,
            false,
            subSchema.required || requiredFromParent,
            continuingLevels,
            [...currentGroupBrackets, ownBracket],
            choiceIsLastInGroup,
          ),
        }),
      );
    } else if (!subSchema.properties && subSchema.type) {
      // Root-level primitive schema
      flatRows.push(
        makePropertyRow({
          name: subSchema.title || '<value>',
          path: currentPath,
          level: currentLevel,
          required: false,
          propertyType: subSchema.type,
          description: subSchema.description,
          examples: getExamples(subSchema),
          constraints: getConstraints(subSchema),
          isLastInGroup: true,
          continuingLevels: [...continuingLevels],
          groupBrackets: [...currentGroupBrackets],
        }),
      );
    }

    if (subSchema.if && (subSchema.then || subSchema.else)) {
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
