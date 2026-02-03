import React from 'react';
import clsx from 'clsx';
import CodeBlock from '@theme/CodeBlock';

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

/**
 * Renders a single property row in the schema table.
 * All data is passed in via the `row` prop, which comes from `tableData`.
 * This component handles multi-row constraints using `rowSpan`.
 */
export default function PropertyRow({ row, isLastInGroup }) {
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

  // Generate background gradients for:
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
  // Position is at the child's level, which is (level * 20 + 8)px
  if (hasChildren) {
    const childLevelPos = level * 1.25 + 0.5;
    allGradients.push(
      'linear-gradient(to bottom, transparent calc(50% + 1em), var(--ifm-table-border-color) calc(50% + 1em))',
    );
    allSizes.push('1px 100%');
    allPositions.push(`${childLevelPos}rem top`);
  }

  // Continuing ancestor lines: full-height vertical lines for ancestors with more siblings
  // Filter to only include levels less than (level - 1) since ::before handles immediate parent
  continuingLevels
    .filter((lvl) => lvl < level - 1)
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

  const containerSymbol = getContainerSymbol(containerType);

  return (
    <>
      <tr className={clsx(required && 'required-row')}>
        <td
          rowSpan={rowSpan}
          style={{ ...indentStyle, ...continuingLinesStyle }}
          className={clsx(
            level > 0 && `level-${level}`,
            isLastInGroup && 'is-last',
            hasChildren && 'has-children',
            containerType && `container-${containerType}`,
          )}
        >
          <span className="property-name">
            {containerSymbol && (
              <span className="container-symbol">{containerSymbol}</span>
            )}
            <strong>{name}</strong>
          </span>
        </td>
        <td rowSpan={rowSpan}>
          <code>{propertyType}</code>
        </td>

        {/* The first constraint cell */}
        <td>
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
        <td rowSpan={rowSpan}>{description || ''}</td>
      </tr>

      {/* Render subsequent constraints in their own rows */}
      {remainingConstraints.map((constraint) => (
        <tr className={clsx(required && 'required-row')} key={constraint}>
          <td>
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
