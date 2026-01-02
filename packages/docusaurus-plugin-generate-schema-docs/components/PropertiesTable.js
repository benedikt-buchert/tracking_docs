import React from 'react';
import SchemaRows from './SchemaRows';
import TableHeader from './TableHeader';
import { getConstraints } from '../helpers/getConstraints';

export default function PropertiesTable({ schema }) {

    return <table>
        <TableHeader />
        <tbody>
            <SchemaRows properties={schema.properties} requiredList={schema.required} getConstraints={getConstraints} />
        </tbody>
    </table>
}