import React, { useState } from 'react';
import SchemaRows from './SchemaRows';
import Heading from '@theme/Heading';
import clsx from 'clsx';
import { getContinuingLinesStyle } from '../helpers/continuingLinesStyle';

/**
 * Renders 'if/then/else' conditionals as a set of `<tr>` elements
 * that integrate directly into the main table body.
 *
 * Structure:
 * 1. Header row: "Conditional Properties"
 * 2. Condition (if) rows: always visible, info-styled
 * 3. Branch toggles (then/else): radio-style, foldable
 */
export default function ConditionalRows({ row }) {
  const { condition, branches, level = 0, continuingLevels = [] } = row;
  const [activeBranch, setActiveBranch] = useState(0);

  const continuingLinesStyle = getContinuingLinesStyle(continuingLevels, level);

  return (
    <>
      {/* Header row */}
      <tr>
        <td colSpan={5} style={continuingLinesStyle}>
          <Heading as="h4" className="conditional-header-headline">
            Conditional Properties
          </Heading>
        </td>
      </tr>

      {/* Condition (if) section - always visible */}
      <tr className="conditional-condition-header">
        <td colSpan={5} style={continuingLinesStyle}>
          <span className="conditional-condition-label">
            <span className="conditional-info-icon">i</span>
            <strong>If</strong>
          </span>
          {condition.description && (
            <p className="conditional-condition-description">
              {condition.description}
            </p>
          )}
        </td>
      </tr>
      <SchemaRows tableData={condition.rows} />

      {/* Branch toggles (then / else) */}
      {branches.map((branch, index) => {
        const isActive = activeBranch === index;
        return (
          <React.Fragment key={branch.title}>
            <tr className="choice-row">
              <td colSpan={5} style={continuingLinesStyle}>
                <label className="choice-row-header">
                  <input
                    type="radio"
                    name={`conditional-${row.path.join('.')}`}
                    checked={isActive}
                    onChange={() => setActiveBranch(index)}
                  />
                  <span className={clsx('choice-row-toggle', 'radio')} />
                  <strong>{branch.title}</strong>
                </label>
                {branch.description && (
                  <p className="choice-row-description">{branch.description}</p>
                )}
              </td>
            </tr>
            {isActive && <SchemaRows tableData={branch.rows} />}
          </React.Fragment>
        );
      })}
    </>
  );
}
