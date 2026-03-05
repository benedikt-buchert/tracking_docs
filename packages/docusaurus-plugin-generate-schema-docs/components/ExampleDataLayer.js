import React from 'react';
import CodeBlock from '@theme/CodeBlock';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import Heading from '@theme/Heading';
import {
  buildExampleModel,
  findClearableProperties,
} from '../helpers/exampleModel';

export default function ExampleDataLayer({ schema, dataLayerName }) {
  const model = buildExampleModel(schema, { dataLayerName });
  const exampleGroups = model.variantGroups;
  const targetId = model.targets[0].id;

  if (!exampleGroups || exampleGroups.length === 0) {
    return null;
  }

  // Handle the simple case of a single default example with no choices
  if (model.isSimpleDefault) {
    const codeSnippet = exampleGroups[0].options[0].snippets[targetId];
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
            {group.options.map(({ title, snippets }, index) => (
              <TabItem value={index} label={title} key={index}>
                <CodeBlock language="javascript">
                  {snippets[targetId]}
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
