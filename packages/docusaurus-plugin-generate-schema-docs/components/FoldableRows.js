import React, { useState } from 'react';
import SchemaRows from './SchemaRows';
import Heading from '@theme/Heading';
import clsx from 'clsx';

/**
 * Generates inline styles for continuing hierarchical lines through a row.
 * @param {number[]} continuingLevels - Array of ancestor levels that need lines
 * @param {number} level - Current level of the choice
 * @returns {object} Style object with background gradients
 */
const getContinuingLinesStyle = (continuingLevels = [], level = 0) => {
  const getLevelPosition = (lvl) => lvl * 1.25 + 0.5;

  const allGradients = [];
  const allSizes = [];
  const allPositions = [];

  // Draw continuing lines for all ancestor levels
  continuingLevels.forEach((lvl) => {
    const pos = getLevelPosition(lvl);
    allGradients.push(
      'linear-gradient(var(--ifm-table-border-color), var(--ifm-table-border-color))',
    );
    allSizes.push('1px 100%');
    allPositions.push(`${pos}rem top`);
  });

  // Also draw the line for the immediate parent level (level - 1) if level > 0
  // This connects the choice rows to their parent property
  if (level > 0) {
    const parentPos = getLevelPosition(level - 1);
    // Check if this position is not already in continuing levels
    if (!continuingLevels.includes(level - 1)) {
      allGradients.push(
        'linear-gradient(var(--ifm-table-border-color), var(--ifm-table-border-color))',
      );
      allSizes.push('1px 100%');
      allPositions.push(`${parentPos}rem top`);
    }
  }

  // Calculate indentation based on level
  const paddingLeft = `${level * 1.25 + 0.5}rem`;

  if (allGradients.length === 0) {
    return { paddingLeft };
  }

  return {
    paddingLeft,
    backgroundImage: allGradients.join(', '),
    backgroundSize: allSizes.join(', '),
    backgroundPosition: allPositions.join(', '),
    backgroundRepeat: 'no-repeat',
  };
};

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
export default function FoldableRows({ row }) {
  const {
    choiceType,
    options,
    description,
    name,
    required,
    level = 0,
    continuingLevels = [],
  } = row;
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

  // Calculate continuing lines style for choice rows
  const continuingLinesStyle = getContinuingLinesStyle(continuingLevels, level);

  return (
    <>
      {/* A header row for the entire choice block */}
      <tr>
        <td colSpan={5} style={continuingLinesStyle}>
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
              name={choiceType === 'oneOf' ? row.title : option.title}
              continuingLinesStyle={continuingLinesStyle}
            />
            {/* If the option is active, render its rows directly into the table body */}
            {isActive && <SchemaRows tableData={option.rows} />}
          </React.Fragment>
        );
      })}
    </>
  );
}
