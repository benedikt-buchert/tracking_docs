import React, { useState, useId } from 'react';
import SchemaRows from './SchemaRows';
import Heading from '@theme/Heading';
import clsx from 'clsx';
import { getControlRowStyles } from '../helpers/continuingLinesStyle';

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
  <tr className="choice-row schema-row--control">
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
export default function FoldableRows({
  row,
  stripeIndex = 0,
  stripeState,
  bracketEnds: parentBracketEnds,
}) {
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

  const { ownBracket, headerStyle, middleStyle, lastToggleStyle } =
    getControlRowStyles({
      level,
      continuingLevels,
      groupBrackets,
      parentBracketEnds,
    });

  return (
    <>
      {/* A header row for the entire choice block */}
      <tr className="schema-row--control">
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
                stripeState={stripeState}
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
