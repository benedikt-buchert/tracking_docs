import React from 'react';
import CodeBlock from '@theme/CodeBlock';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import Heading from '@theme/Heading';
import { schemaToExamples } from '../helpers/schemaToExamples';

const generateCodeSnippet = (example, schema) => {
  const clearableProperties = findClearableProperties(schema || {});
  let codeSnippet = '';
  const propertiesToClear = clearableProperties.filter((prop) => prop in example);

  if (propertiesToClear.length > 0) {
    const resetObject = {};
    propertiesToClear.forEach((prop) => {
      resetObject[prop] = null;
    });
    codeSnippet += `window.dataLayer.push(${JSON.stringify(resetObject, null, 2)});\n`;
  }

  codeSnippet += `window.dataLayer.push(${JSON.stringify(example, null, 2)});`;
  return codeSnippet;
};

export default function ExampleDataLayer({ schema }) {
  const exampleGroups = schemaToExamples(schema);

  if (!exampleGroups || exampleGroups.length === 0) {
    return null;
  }

  // Handle the simple case of a single default example with no choices
  if (
    exampleGroups.length === 1 &&
    exampleGroups[0].property === 'default'
  ) {
    const codeSnippet = generateCodeSnippet(exampleGroups[0].options[0].example, schema);
    return <CodeBlock language="javascript">{codeSnippet}</CodeBlock>;
  }

  return (
    <>
      {exampleGroups.map((group) => (
        <div key={group.property} style={{ marginTop: '20px' }}>
          <Heading as="h4">
            <code>{group.property}</code> options:
          </Heading>
          <Tabs>
            {group.options.map(({ title, example }, index) => (
              <TabItem value={index} label={title} key={index}>
                <CodeBlock language="javascript">
                  {generateCodeSnippet(example, schema)}
                </CodeBlock>
              </TabItem>
            ))}
          </Tabs>
        </div>
      ))}
    </>
  );
}

export const findClearableProperties = (schema) => {
  if (!schema || !schema.properties) return [];

  return Object.entries(schema.properties)
    .filter(([, definition]) => definition['x-gtm-clear'] === true)
    .map(([key]) => key);
};
