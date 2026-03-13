import React, { useState } from 'react';
import SchemaRows from './SchemaRows';
import TableHeader from './TableHeader';
import WordWrapButton from './WordWrapButton';
import { schemaToTableData } from '../helpers/schemaToTableData';
import styles from './PropertiesTable.module.css';

function filterInheritedTopLevelProperties(schema, sourceSchema) {
  if (!schema?.properties || !sourceSchema?.properties) {
    return schema;
  }

  const sourceKeys = new Set(Object.keys(sourceSchema.properties));
  const filteredEntries = Object.entries(schema.properties).filter(
    ([key, propSchema]) => {
      if (sourceKeys.has(key)) {
        return true;
      }

      const hasDescription =
        typeof propSchema?.description === 'string' &&
        propSchema.description.trim().length > 0;
      const hasExamples =
        Array.isArray(propSchema?.examples) && propSchema.examples.length > 0;
      const hasExample = propSchema?.example !== undefined;

      return hasDescription || hasExamples || hasExample;
    },
  );

  return {
    ...schema,
    properties: Object.fromEntries(filteredEntries),
  };
}

export default function PropertiesTable({ schema, sourceSchema }) {
  const [isWordWrapOn, setIsWordWrapOn] = useState(true);
  const tableSchema = filterInheritedTopLevelProperties(schema, sourceSchema);
  const tableData = schemaToTableData(tableSchema);
  const stripeState = { current: 0 };

  return (
    <div
      className={`${styles.tableWrapper} ${
        !isWordWrapOn ? styles.noWordWrap : ''
      }`}
    >
      <div className={styles.buttonGroup}>
        <WordWrapButton
          onClick={() => setIsWordWrapOn((w) => !w)}
          isEnabled={isWordWrapOn}
        />
      </div>
      <table className="schema-table">
        <TableHeader />
        <tbody>
          <SchemaRows tableData={tableData} stripeState={stripeState} />
        </tbody>
      </table>
    </div>
  );
}
