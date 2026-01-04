import React from 'react';
import CodeBlock from '@theme/CodeBlock';
import buildExampleFromSchema from '../helpers/buildExampleFromSchema';

export default function ExampleDataLayer({ schema }) {
    // 1. Identify properties that need to be reset (cleared) first
    const clearableProperties = findClearableProperties(schema || {});

    // 2. Build the main example data
    const example = buildExampleFromSchema(schema || {});

    // 3. Construct the code snippet
    let codeSnippet = '';

    // Filter properties to reset to only those present in the example
    const propertiesToClear = clearableProperties.filter(prop => prop in example);

    // If there are properties to reset, push them as null first
    if (propertiesToClear.length > 0)
    {
        const resetObject = {};
        propertiesToClear.forEach(prop => {
            resetObject[prop] = null;
        });
        codeSnippet += `window.dataLayer.push(${JSON.stringify(resetObject, null, 2)});\n`;
    }

    // Append the main data payload
    codeSnippet += `window.dataLayer.push(${JSON.stringify(example, null, 2)});`;

    return <CodeBlock language="javascript">{codeSnippet}</CodeBlock>
};

export const findClearableProperties = (schema) => {
    if (!schema || !schema.properties) return [];

    return Object.entries(schema.properties)
        .filter(([key, definition]) => definition["x-gtm-clear"] === true)
        .map(([key]) => key);
}
