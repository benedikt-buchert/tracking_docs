import React from 'react';
import './SchemaRows.css';
import PropertyRow from './PropertyRow';
import FoldableRows from './FoldableRows';
import ConditionalRows from './ConditionalRows';

/**
 * Renders the rows of the schema table from a flat `tableData` array.
 * It maps over the array and renders the appropriate component for each row.
 *
 * @param {object} props
 * @param {Array} props.tableData - Flat array of row objects
 * @param {Array} [props.bracketEnds] - Bracket descriptors that end on the last row
 */
export default function SchemaRows({ tableData, bracketEnds }) {
  if (!tableData) {
    return null;
  }

  return tableData.map((row, index) => {
    const key = row.path.join('.');
    const isLast = index === tableData.length - 1;

    if (row.type === 'choice') {
      return (
        <FoldableRows
          key={key}
          row={row}
          bracketEnds={isLast ? bracketEnds : undefined}
        />
      );
    }

    if (row.type === 'conditional') {
      return (
        <ConditionalRows
          key={key}
          row={row}
          bracketEnds={isLast ? bracketEnds : undefined}
        />
      );
    }

    if (row.type === 'property') {
      return (
        <PropertyRow
          key={key}
          row={row}
          isLastInGroup={row.isLastInGroup}
          bracketEnds={isLast ? bracketEnds : undefined}
        />
      );
    }

    return null;
  });
}
