import React, { useState, useId } from 'react';
import SchemaRows from './SchemaRows';
import clsx from 'clsx';
import { getControlRowStyles } from '../helpers/continuingLinesStyle';

/**
 * Renders 'if/then/else' conditionals as a set of `<tr>` elements
 * that integrate directly into the main table body.
 *
 * Structure:
 * 1. Condition (if) rows: always visible, info-styled
 * 2. Branch toggles (then/else): radio-style, foldable
 */
export default function ConditionalRows({
  row,
  stripeIndex = 0,
  stripeState,
  bracketEnds: parentBracketEnds,
}) {
  const {
    condition,
    branches,
    level = 0,
    continuingLevels = [],
    groupBrackets = [],
  } = row;
  const [activeBranch, setActiveBranch] = useState(0);
  const radioGroupId = useId();

  const { ownBracket, headerStyle, middleStyle, lastToggleStyle } =
    getControlRowStyles({
      level,
      continuingLevels,
      groupBrackets,
      parentBracketEnds,
    });

  return (
    <>
      {/* Condition (if) section - always visible */}
      <tr className="conditional-condition-header schema-row--control">
        <td colSpan={5} style={headerStyle}>
          <span className="conditional-condition-label">
            <span className="conditional-info-icon-wrapper">
              <span className="conditional-info-icon">i</span>
              <span className="conditional-info-tooltip">
                The properties below define the condition. When the condition is
                met, the &ldquo;Then&rdquo; branch applies. Otherwise, the
                &ldquo;Else&rdquo; branch applies.
              </span>
            </span>
            <strong>If</strong>
          </span>
          {condition.description && (
            <p className="conditional-condition-description">
              {condition.description}
            </p>
          )}
        </td>
      </tr>
      <SchemaRows tableData={condition.rows} stripeState={stripeState} />

      {/* Branch toggles (then / else) */}
      {branches.map((branch, index) => {
        const isActive = activeBranch === index;
        const isLastBranch = index === branches.length - 1;
        const toggleStyle =
          isLastBranch && !isActive ? lastToggleStyle : middleStyle;
        return (
          <React.Fragment key={branch.title}>
            <tr className="choice-row schema-row--control">
              <td colSpan={5} style={toggleStyle}>
                <label className="choice-row-header">
                  <input
                    type="radio"
                    name={`conditional-${radioGroupId}`}
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
            {isActive && (
              <SchemaRows
                tableData={branch.rows}
                stripeState={stripeState}
                bracketEnds={
                  isLastBranch
                    ? [ownBracket, ...(parentBracketEnds || [])]
                    : undefined
                }
              />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}
