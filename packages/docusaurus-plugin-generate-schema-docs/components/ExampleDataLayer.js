import React from 'react';
import CodeBlock from '@theme/CodeBlock';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import Heading from '@theme/Heading';
import buildExampleFromSchema from '../helpers/buildExampleFromSchema';

const generateCodeSnippet = (example, schema) => {
    const clearableProperties = findClearableProperties(schema || {});
    let codeSnippet = '';
    const propertiesToClear = clearableProperties.filter(prop => prop in example);

    if (propertiesToClear.length > 0) {
        const resetObject = {};
        propertiesToClear.forEach(prop => {
            resetObject[prop] = null;
        });
        codeSnippet += `window.dataLayer.push(${JSON.stringify(resetObject, null, 2)});\n`;
    }

    codeSnippet += `window.dataLayer.push(${JSON.stringify(example, null, 2)});`;
    return codeSnippet;
};

export default function ExampleDataLayer({ schema }) {
    const properties = schema.properties || {};
    const oneOfAnyOfProperties = Object.entries(properties).filter(([, prop]) => prop.oneOf || prop.anyOf);

    if (oneOfAnyOfProperties.length > 0) {
        return (
            <>
                {oneOfAnyOfProperties.map(([key, prop]) => {
                    const choices = prop.oneOf || prop.anyOf;
                    return (
                        <div key={key} style={{ marginTop: '20px' }}>
                            <Heading as="h4"><code>{key}</code> options:</Heading>
                            <Tabs>
                                {choices.map((choice, index) => {
                                    const getChoice = (schemas) => {
                                        if (schemas === choices) {
                                            return index;
                                        }
                                        return 0; // Default to first choice for other oneOf/anyOf
                                    };
                                    const example = buildExampleFromSchema(schema, getChoice);
                                    const codeSnippet = generateCodeSnippet(example, schema);
                                    return (
                                        <TabItem value={index} label={choice.title || `Option ${index + 1}`} key={index}>
                                            <CodeBlock language="javascript">{codeSnippet}</CodeBlock>
                                        </TabItem>
                                    );
                                })}
                            </Tabs>
                        </div>
                    );
                })}
            </>
        );
    }

    const example = buildExampleFromSchema(schema);
    const codeSnippet = generateCodeSnippet(example, schema);
    return <CodeBlock language="javascript">{codeSnippet}</CodeBlock>
};

export const findClearableProperties = (schema) => {
    if (!schema || !schema.properties) return [];

    return Object.entries(schema.properties)
        .filter(([key, definition]) => definition["x-gtm-clear"] === true)
        .map(([key]) => key);
}
