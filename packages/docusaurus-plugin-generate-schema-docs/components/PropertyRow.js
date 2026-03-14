import React from 'react';
import clsx from 'clsx';
import CodeBlock from '@theme/CodeBlock';
import { getBracketLinesStyle } from '../helpers/continuingLinesStyle';

/**
 * Formats a single example value into a string for display in a CodeBlock.
 * @param {any} singleEx The example to format.
 * @returns {string|null}
 */
const formatExample = (singleEx) => {
  if (typeof singleEx === 'undefined' || singleEx === null) return null;
  if (typeof singleEx === 'object') return JSON.stringify(singleEx, null, 2);
  if (typeof singleEx === 'string') return JSON.stringify(singleEx);
  return String(singleEx);
};

/**
 * Returns the container symbol for a property based on its container type.
 * @param {string|null} containerType - 'object', 'array', or null
 * @returns {string} The symbol to display
 */
const getContainerSymbol = (containerType) => {
  if (containerType === 'object') return '{}';
  if (containerType === 'array') return '[]';
  return '';
};

const formatPropertyType = (value) => {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value === undefined || value === null) {
    return '';
  }
  return JSON.stringify(value);
};

const KEYWORD_HELP_TEXT = {
  additionalProperties:
    'Controls properties not listed in properties and not matched by patternProperties.',
  patternProperties:
    'Applies the subschema to property names that match the given regular expression.',
};

const SCHEMA_KEYWORD_BADGE_TEXT = 'Schema constraint';

function splitKeywordLabel(name) {
  const match = /^patternProperties (\/.+\/)$/.exec(name);
  if (!match) {
    return null;
  }

  return {
    keyword: 'patternProperties',
    pattern: match[1],
  };
}

function buildKeywordHelpId(name, rowPath) {
  if (!rowPath || rowPath.length === 0) {
    return `schema-keyword-help-${name}`;
  }

  const normalizedPath = rowPath.join('-').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `schema-keyword-help-${normalizedPath}`;
}

/**
 * Renders a single property row in the schema table.
 * All data is passed in via the `row` prop, which comes from `tableData`.
 * This component handles multi-row constraints using `rowSpan`.
 */
export default function PropertyRow({
  row,
  stripeIndex,
  isLastInGroup,
  bracketEnds,
}) {
  const {
    name,
    level,
    required,
    propertyType,
    description,
    examples,
    constraints,
    hasChildren,
    containerType,
    continuingLevels = [],
    groupBrackets = [],
    isSchemaKeywordRow = false,
    keepConnectorOpen = false,
  } = row;

  const indentStyle = {
    paddingLeft: `${level * 1.25 + 0.5}rem`,
  };

  const hasConstraints = constraints && constraints.length > 0;
  // Set rowspan to 1 if there are no constraints.
  const rowSpan = hasConstraints ? constraints.length : 1;
  // Gracefully handle case with no constraints
  const [firstConstraint, ...remainingConstraints] = hasConstraints
    ? constraints
    : [null];

  // Generate background gradients for tree connector lines (left side):
  // 1. Parent-to-child line (from 50% down) - for elements with children
  // 2. Continuing ancestor lines (full height) - for ancestors that have more siblings below
  //
  // Position mapping: level N's line is at position (N * 1.25 + 0.5)rem
  // This matches the CSS: level-1 at 0.5rem, level-2 at 1.75rem, etc.
  const getLevelPosition = (lvl) => lvl * 1.25 + 0.5;

  const allGradients = [];
  const allSizes = [];
  const allPositions = [];

  // Parent-to-child line: draws from 50% (below symbol) to bottom of cell
  if (hasChildren) {
    const childLevelPos = level * 1.25 + 0.5;
    allGradients.push(
      'linear-gradient(to bottom, transparent calc(50% + 1em), var(--ifm-table-border-color) calc(50% + 1em))',
    );
    allSizes.push('1px 100%');
    allPositions.push(`${childLevelPos}rem top`);
  }

  // Continuing ancestor lines: full-height vertical lines for ancestors with more siblings.
  // Only levels strictly below the immediate parent (< level - 1) are drawn here.
  // The ::before pseudo-element handles the immediate parent connector at level - 1.
  // We also require lvl+1 to be in continuingLevels: if the next level up is not continuing
  // (i.e. the parent was the last sibling), drawing lvl's line would create a stray line at
  // the same x-position as that parent's elbow.
  continuingLevels
    .filter((lvl) => lvl < level - 1 && continuingLevels.includes(lvl + 1))
    .forEach((lvl) => {
      const pos = getLevelPosition(lvl);
      allGradients.push(
        'linear-gradient(var(--ifm-table-border-color), var(--ifm-table-border-color))',
      );
      allSizes.push('1px 100%');
      allPositions.push(`${pos}rem top`);
    });

  const continuingLinesStyle =
    allGradients.length > 0
      ? {
          backgroundImage: allGradients.join(', '),
          backgroundSize: allSizes.join(', '),
          backgroundPosition: allPositions.join(', '),
          backgroundRepeat: 'no-repeat',
        }
      : {};

  // Bracket lines on the right side (description column)
  const bracketCaps = bracketEnds ? { ending: bracketEnds } : undefined;
  const bracketStyle = getBracketLinesStyle(groupBrackets, bracketCaps);

  const containerSymbol = getContainerSymbol(containerType);
  const shouldCloseConnector = isLastInGroup && !keepConnectorOpen;
  const splitKeyword = splitKeywordLabel(name);
  const keywordHelpKey = name.startsWith('patternProperties ')
    ? 'patternProperties'
    : name;
  const keywordHelpText = KEYWORD_HELP_TEXT[keywordHelpKey];
  const keywordHelpId = keywordHelpText
    ? buildKeywordHelpId(name, row.path)
    : undefined;
  const zebraClassName =
    stripeIndex === undefined
      ? undefined
      : stripeIndex % 2 === 0
        ? 'schema-row--zebra-even'
        : 'schema-row--zebra-odd';

  return (
    <>
      <tr
        className={clsx(
          zebraClassName,
          required && 'required-row',
          row.isCondition && 'conditional-condition-row',
        )}
      >
        <td
          rowSpan={rowSpan}
          style={{ ...indentStyle, ...continuingLinesStyle }}
          className={clsx(
            'property-cell',
            isSchemaKeywordRow && 'property-cell--keyword',
            required && 'property-cell--required',
            level > 0 && 'property-cell--tree',
            level > 0 && `level-${level}`,
            shouldCloseConnector && 'is-last',
            hasChildren && 'has-children',
            containerType && `container-${containerType}`,
          )}
        >
          <span
            className={clsx(
              'property-name',
              isSchemaKeywordRow && 'property-name--keyword',
            )}
          >
            {containerSymbol && (
              <span className="container-symbol">{containerSymbol}</span>
            )}
            {isSchemaKeywordRow ? (
              <span className="property-keyword-wrapper">
                {splitKeyword ? (
                  <span className="property-keyword-stack">
                    <code
                      className="property-keyword"
                      aria-describedby={keywordHelpId}
                    >
                      {splitKeyword.keyword}
                    </code>
                    <code className="property-keyword-pattern">
                      {splitKeyword.pattern}
                    </code>
                  </span>
                ) : (
                  <code
                    className="property-keyword"
                    aria-describedby={keywordHelpId}
                  >
                    {name}
                  </code>
                )}
                <span className="property-keyword-badge">
                  {SCHEMA_KEYWORD_BADGE_TEXT}
                </span>
                <span
                  id={keywordHelpId}
                  className="property-keyword-tooltip"
                  role="tooltip"
                >
                  {keywordHelpText}
                </span>
              </span>
            ) : (
              <strong>{name}</strong>
            )}
          </span>
        </td>
        <td rowSpan={rowSpan}>
          <code>{formatPropertyType(propertyType)}</code>
        </td>

        {/* The first constraint cell */}
        <td className="constraint-cell">
          {firstConstraint && (
            <code
              className={clsx(
                'constraint-code',
                firstConstraint === 'required' && 'required',
              )}
            >
              {firstConstraint}
            </code>
          )}
        </td>

        <td rowSpan={rowSpan}>
          {examples &&
            examples.map((ex, i) => {
              const formatted = formatExample(ex);
              return (
                formatted && (
                  <CodeBlock
                    key={i}
                    language="json"
                    className="schema-examples"
                  >
                    {formatted}
                  </CodeBlock>
                )
              );
            })}
        </td>
        <td rowSpan={rowSpan} style={bracketStyle}>
          {description || ''}
        </td>
      </tr>

      {/* Render subsequent constraints in their own rows */}
      {remainingConstraints.map((constraint) => (
        <tr
          className={clsx(zebraClassName, required && 'required-row')}
          key={constraint}
        >
          <td className="constraint-cell">
            <code
              className={clsx(
                'constraint-code',
                constraint === 'required' && 'required',
              )}
            >
              {constraint}
            </code>
          </td>
        </tr>
      ))}
    </>
  );
}
