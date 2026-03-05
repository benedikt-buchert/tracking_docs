import React, { useState, useId } from 'react';
import SchemaRows from './SchemaRows';
import Heading from '@theme/Heading';
import clsx from 'clsx';
import {
  getContinuingLinesStyle,
  getBracketLinesStyle,
  mergeBackgroundStyles,
} from '../helpers/continuingLinesStyle';

// A clickable row that acts as a header/summary for a foldable choice
const ChoiceRow = ({
  title,
  description,
  onToggle,
  isActive,
  isRadio,
  name,
  continuingLinesStyle,
}) => (
  <tr className="choice-row">
    <td colSpan={5} style={continuingLinesStyle}>
      <label className="choice-row-header">
        <input
          type={isRadio ? 'radio' : 'checkbox'}
          name={name}
          checked={isActive}
          onChange={onToggle}
        />
        <span
          className={clsx('choice-row-toggle', isRadio ? 'radio' : 'checkbox')}
        />
        <strong>{title}</strong>
      </label>
      {description && <p className="choice-row-description">{description}</p>}
    </td>
  </tr>
);

/**
 * Renders 'oneOf' and 'anyOf' choices as a set of foldable `<tr>` elements
 * that integrate directly into the main table body.
 */
export default function FoldableRows({ row, bracketEnds: parentBracketEnds }) {
  const {
    choiceType,
    options,
    description,
    name,
    required,
    level = 0,
    continuingLevels = [],
    groupBrackets = [],
  } = row;
  const radioGroupId = useId();
  const [openOneOf, setOpenOneOf] = useState(0); // For oneOf, track the single open index
  const [openAnyOf, setOpenAnyOf] = useState({}); // For anyOf, track each option's state

  const handleAnyOfToggle = (index) => {
    setOpenAnyOf((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const selectTitle = `Select ${
    choiceType === 'oneOf' ? 'one' : 'any'
  } of the following options:`;
  const header = name ? (
    <>
      <strong>{name}</strong>
      {required && <span className="required-badge">required</span>}
      {' - '}
      {selectTitle}
    </>
  ) : (
    selectTitle
  );

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

  // Header row: top cap on the ownBracket
  const headerBracketStyle = getBracketLinesStyle(allBrackets, {
    starting: [ownBracket],
  });
  const headerMerged = mergeBackgroundStyles(
    treePassthrough,
    headerBracketStyle,
  );
  const headerStyle = { ...headerMerged, ...indent, paddingTop: '0.5rem' };

  // Middle rows (option toggles): no caps
  const middleBracketStyle = getBracketLinesStyle(allBrackets);
  const middleMerged = mergeBackgroundStyles(
    treePassthrough,
    middleBracketStyle,
  );
  const middleStyle = { ...middleMerged, ...indent };

  // Last toggle when its content is NOT shown: bottom cap on ownBracket (+ parent ends)
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
      {/* A header row for the entire choice block */}
      <tr>
        <td colSpan={5} style={headerStyle}>
          <Heading as="h4" className="choice-row-header-headline">
            {header}
          </Heading>
          <p className="choice-row-header-description">{description}</p>
        </td>
      </tr>

      {/* Render the options */}
      {options.map((option, index) => {
        const isActive =
          choiceType === 'oneOf' ? openOneOf === index : !!openAnyOf[index];
        const isLastOption = index === options.length - 1;
        // Last toggle needs bottom cap when its content is hidden
        const toggleStyle =
          isLastOption && !isActive ? lastToggleStyle : middleStyle;
        return (
          <React.Fragment key={option.title}>
            <ChoiceRow
              title={option.title}
              description={option.description}
              onToggle={() =>
                choiceType === 'oneOf'
                  ? setOpenOneOf(index)
                  : handleAnyOfToggle(index)
              }
              isActive={isActive}
              isRadio={choiceType === 'oneOf'}
              name={
                choiceType === 'oneOf'
                  ? `oneOf-${radioGroupId}`
                  : `anyOf-${option.title}-${radioGroupId}`
              }
              continuingLinesStyle={toggleStyle}
            />
            {/* If the option is active, render its rows directly into the table body */}
            {isActive && (
              <SchemaRows
                tableData={option.rows}
                bracketEnds={
                  isLastOption
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
