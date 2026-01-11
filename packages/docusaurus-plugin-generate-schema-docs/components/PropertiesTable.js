import React from 'react';
import SchemaRows from './SchemaRows';
import TableHeader from './TableHeader';
import OneOf from './OneOf';
import { getConstraints } from '../helpers/getConstraints';

export default function PropertiesTable({ schema }) {
    const hasRootChoice = schema.oneOf || schema.anyOf;

    if (hasRootChoice) {
        const choices = schema.oneOf || schema.anyOf;
        const type = schema.oneOf ? 'oneOf' : 'anyOf';
        return <OneOf schemas={choices} level={0} getConstraints={getConstraints} type={type} isRoot={true} />;
    }

    return (
        <table>
            <TableHeader />
            <tbody>
                <SchemaRows properties={schema.properties} requiredList={schema.required} getConstraints={getConstraints} />
            </tbody>
        </table>
    );
}
