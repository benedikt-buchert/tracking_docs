import React from 'react';
import SchemaRows from './SchemaRows';
import TableHeader from './TableHeader';
import { schemaToTableData } from '../helpers/schemaToTableData';

export default function PropertiesTable({ schema }) {
  const tableData = schemaToTableData(schema);

  return (
    <table>
      <TableHeader />
      <tbody>
        <SchemaRows tableData={tableData} />
      </tbody>
    </table>
  );
}
