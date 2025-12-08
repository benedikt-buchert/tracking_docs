import CodeBlock from '@theme/CodeBlock';
import ExampleDataLayer from './ExampleDataLayer';
import PropertiesTable from './PropertiesTable';

// --- Main Exported Component ---
// Helper: Build an example payload from per-property `examples` or other hints


export default function SchemaViewer({ schema }) {

    return (
        <div>
            <h2>DataLayer Example</h2>
            <ExampleDataLayer schema={schema} />

            <h2>Event Properties</h2>
            <PropertiesTable schema={schema} />

            {/* 3. Raw Source (Optional) */}
            <details>
                <summary>View Raw JSON Schema</summary>
                <CodeBlock language="json">{JSON.stringify(schema, null, 2)}</CodeBlock>
            </details>
        </div>
    );
}