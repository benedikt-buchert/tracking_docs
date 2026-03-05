import React, { useState, useId } from 'react';
import SchemaRows from './SchemaRows';
import clsx from 'clsx';
import {
  getContinuingLinesStyle,
  getBracketLinesStyle,
  mergeBackgroundStyles,
} from '../helpers/continuingLinesStyle';

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

  // Compute this group's own bracket and combine with any parent brackets.
  // bracketIndex = total number of existing brackets, so each group gets a unique position.
  const ownBracket = {
    level,
    bracketIndex: groupBrackets.length,
  };
  const allBrackets = [...groupBrackets, ownBracket];

  // colSpan=5 rows need continuing ancestor lines to pass through (for visual
  // continuity). They don't have ::before/::after connectors, so we draw all
  // ancestor lines via background gradients. We always include the immediate
  // parent level (level-1) so the parent-to-child connector passes through.
  // Only draw ancestor lines where the next level up is also continuing;
  // this matches PropertyRow's filter to avoid stray lines at a parent's
  // corner connector when that parent is the last in its group.
  const ancestorLevels = continuingLevels.filter(
    (lvl) => lvl < level && continuingLevels.includes(lvl + 1),
  );
  // Always include the immediate parent level so the parent-to-child
  // connector passes through these full-width rows.
  if (level > 0 && !ancestorLevels.includes(level - 1)) {
    ancestorLevels.push(level - 1);
  }
  const treePassthrough = getContinuingLinesStyle(ancestorLevels, 0);
  const indent = { paddingLeft: `${level * 1.25 + 0.5}rem` };

  // If header: top cap on ownBracket
  const headerBracketStyle = getBracketLinesStyle(allBrackets, {
    starting: [ownBracket],
  });
  const headerMerged = mergeBackgroundStyles(
    treePassthrough,
    headerBracketStyle,
  );
  const headerStyle = { ...headerMerged, ...indent, paddingTop: '0.5rem' };

  // Middle rows (branch toggles): no caps
  const middleBracketStyle = getBracketLinesStyle(allBrackets);
  const middleMerged = mergeBackgroundStyles(
    treePassthrough,
    middleBracketStyle,
  );
  const middleStyle = { ...middleMerged, ...indent };

  // Last branch toggle when content is NOT shown: bottom cap (+ parent ends)
  const allEndings = [ownBracket, ...(parentBracketEnds || [])];
  const lastToggleBracketStyle = getBracketLinesStyle(allBrackets, {
    ending: allEndings,
  });
  const lastToggleMerged = mergeBackgroundStyles(
    treePassthrough,
    lastToggleBracketStyle,
  );
  const lastToggleStyle = {
    ...lastToggleMerged,
    ...indent,
    paddingBottom: '0.5rem',
  };

  return (
    <>
      {/* Condition (if) section - always visible */}
      <tr className="conditional-condition-header">
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
      <SchemaRows tableData={condition.rows} />

      {/* Branch toggles (then / else) */}
      {branches.map((branch, index) => {
        const isActive = activeBranch === index;
        const isLastBranch = index === branches.length - 1;
        const toggleStyle =
          isLastBranch && !isActive ? lastToggleStyle : middleStyle;
        return (
          <React.Fragment key={branch.title}>
            <tr className="choice-row">
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
