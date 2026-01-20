import React from 'react';
import './SchemaRows.css';
import PropertyRow from './PropertyRow';
import FoldableRows from './FoldableRows';

/**
 * Renders the rows of the schema table from a flat `tableData` array.
 * It maps over the array and renders the appropriate component for each row.
 */
export default function SchemaRows({ tableData }) {
  if (!tableData) {
    return null;
  }

  return tableData.map((row) => {
    const key = row.path.join('.');

    if (row.type === 'choice') {
      return <FoldableRows key={key} row={row} />;
    }

    if (row.type === 'property') {
      return (
        <PropertyRow
          key={key}
          row={row}
          isLastInGroup={row.isLastInGroup}
        />
      );
    }

    return null;
  });
}
