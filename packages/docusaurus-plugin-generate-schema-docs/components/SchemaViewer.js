import Heading from '@theme/Heading';
import ExampleDataLayer from './ExampleDataLayer';
import PropertiesTable from './PropertiesTable';

// --- Main Exported Component ---
// Helper: Build an example payload from per-property `examples` or other hints


export default function SchemaViewer({ schema }) {

    return (
        <div>
            <Heading as="h2">DataLayer Example</Heading>
            <ExampleDataLayer schema={schema} />

            <Heading as="h2">Event Properties</Heading>
            <PropertiesTable schema={schema} />
        </div>
    );
}