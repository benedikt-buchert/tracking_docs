import React from 'react';
import Heading from '@theme/Heading';
import ExampleDataLayer from './ExampleDataLayer';
import PropertiesTable from './PropertiesTable';

const hasOneOfAnyOf = (schema) => {
    if (!schema || !schema.properties) return false;
    return Object.values(schema.properties).some(prop => prop.oneOf || prop.anyOf);
};

export default function SchemaViewer({ schema }) {
    const exampleTitle = hasOneOfAnyOf(schema) ? 'DataLayer Examples' : 'DataLayer Example';

    return (
        <div>
            <Heading as="h2">{exampleTitle}</Heading>
            <ExampleDataLayer schema={schema} />

            <Heading as="h2">Event Properties</Heading>
            <PropertiesTable schema={schema} />
        </div>
    );
}
