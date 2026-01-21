import React from 'react';
import clsx from 'clsx';
import CodeBlock from '@theme/CodeBlock';

/**
 * Formats an example value into a string for display in a CodeBlock.
 * - Objects are stringified with indentation.
 * - Arrays are joined by newlines.
 * @param {any} example The example to format.
 * @returns {string}
 */
const formatExample = (example) => {
  if (typeof example === 'undefined' || example === null) return '';
  if (Array.isArray(example)) {
    return example
      .map((ex) =>
        typeof ex === 'object' ? JSON.stringify(ex, null, 2) : String(ex),
      )
      .join('\n');
  }
  if (typeof example === 'object') {
    return JSON.stringify(example, null, 2);
  }
  return String(example);
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
    example,
    constraints,
  } = row;

  const indentStyle = {
    paddingLeft: `${level * 20 + 8}px`,
  };

  const hasConstraints = constraints && constraints.length > 0;
  // Set rowspan to 1 if there are no constraints.
  const rowSpan = hasConstraints ? constraints.length : 1;
  // Gracefully handle case with no constraints
  const [firstConstraint, ...remainingConstraints] = hasConstraints
    ? constraints
    : [null];
  const formattedExample = formatExample(example);

  return (
    <>
      <tr className={clsx(required && 'required-row')}>
        <td
          rowSpan={rowSpan}
          style={indentStyle}
          className={clsx(
            level > 0 && `level-${level}`,
            isLastInGroup && 'is-last',
          )}
        >
          <strong>{name}</strong>
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
          {formattedExample && (
            <CodeBlock language="json" className="schema-examples">
              {formattedExample}
            </CodeBlock>
          )}
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
