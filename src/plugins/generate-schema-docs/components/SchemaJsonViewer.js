import CodeBlock from '@theme/CodeBlock';

export default function SchemaJsonViewer({ schema }) {

    return (
        <details>
            <summary>View Raw JSON Schema</summary>
            <CodeBlock language="json">{JSON.stringify(schema, null, 2)}</CodeBlock>
        </details>);
}