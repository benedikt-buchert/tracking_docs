import React from 'react';
import Heading from '@theme/Heading';
import ExampleDataLayer from './ExampleDataLayer';
import PropertiesTable from './PropertiesTable';
import OneOf from './OneOf';
import { getConstraints } from '../helpers/getConstraints';


const hasOneOfAnyOf = (schema) => {
    if (!schema) return false;
    if (schema.oneOf || schema.anyOf) return true;
    if (!schema.properties) return false;
    return Object.values(schema.properties).some(prop => prop.oneOf || prop.anyOf);
};

const RootChoiceProperties = ({ schema }) => {
    const choices = schema.oneOf || schema.anyOf;
    const type = schema.oneOf ? 'oneOf' : 'anyOf';

    return (
        <table>
            <OneOf
                schemas={choices}
                level={0}
                getConstraints={getConstraints}
                type={type}
            />
        </table>
    );
};


export default function SchemaViewer({ schema }) {
    const exampleTitle = hasOneOfAnyOf(schema) ? 'DataLayer Examples' : 'DataLayer Example';
    const hasRootChoice = schema.oneOf || schema.anyOf;

    return (
        <div>
            <Heading as="h2">{exampleTitle}</Heading>
            <ExampleDataLayer schema={schema} />

            <Heading as="h2">Event Properties</Heading>
            {hasRootChoice ? (
                <RootChoiceProperties schema={schema} />
            ) : (
                <PropertiesTable schema={schema} />
            )}
        </div>
    );
}
