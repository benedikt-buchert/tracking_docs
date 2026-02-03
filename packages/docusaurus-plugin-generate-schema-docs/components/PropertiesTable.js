import React, { useState } from 'react';
import SchemaRows from './SchemaRows';
import TableHeader from './TableHeader';
import WordWrapButton from './WordWrapButton';
import { schemaToTableData } from '../helpers/schemaToTableData';
import styles from './PropertiesTable.module.css';

export default function PropertiesTable({ schema }) {
  const [isWordWrapOn, setIsWordWrapOn] = useState(true);
  const tableData = schemaToTableData(schema);

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
      <table>
        <TableHeader />
        <tbody>
          <SchemaRows tableData={tableData} />
        </tbody>
      </table>
    </div>
  );
}
