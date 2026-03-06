import React from 'react';
import CodeBlock from '@theme/CodeBlock';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import Heading from '@theme/Heading';
import { schemaToExamples } from '../helpers/schemaToExamples';
import {
  findClearableProperties,
  generateSnippetForTarget,
} from '../helpers/snippetTargets';

export default function ExampleDataLayer({ schema, dataLayerName }) {
  const exampleGroups = schemaToExamples(schema);

  if (!exampleGroups || exampleGroups.length === 0) {
    return null;
  }

  // Handle the simple case of a single default example with no choices
  if (exampleGroups.length === 1 && exampleGroups[0].property === 'default') {
    const codeSnippet = generateSnippetForTarget({
      targetId: 'web-datalayer-js',
      example: exampleGroups[0].options[0].example,
      schema,
      dataLayerName,
    });
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
                  {generateSnippetForTarget({
                    targetId: 'web-datalayer-js',
                    example,
                    schema,
                    dataLayerName,
                  })}
                </CodeBlock>
              </TabItem>
            ))}
          </Tabs>
        </div>
      ))}
    </>
  );
}
export { findClearableProperties };
