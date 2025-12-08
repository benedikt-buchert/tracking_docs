import React from 'react';
import CodeBlock from '@theme/CodeBlock';
import ExampleDataLayer from './ExampleDataLayer';

// --- Helper: Recursive Table Row Renderer ---
const SchemaRows = ({ properties, requiredList = [], level = 0 }) => {
    const nestedItems = [];

    // Separate nested objects/arrays to render them later (recursion)
    Object.entries(properties).forEach(([key, prop]) => {
        if ((prop.type === 'object' && prop.properties) ||
            (prop.type === 'array' && prop.items && prop.items.properties))
        {
            nestedItems.push({ key, prop });
        }
    });

    return (
        <>
            {Object.entries(properties).map(([key, prop]) => {
                const isReq = requiredList.includes(key);
                // visual indicator if this row has children
                const hasChildren = nestedItems.find(i => i.key === key);

                return (
                    <tr key={key} style={{ backgroundColor: isReq ? 'rgba(255,0,0,0.05)' : 'transparent' }}>
                        <td>
                            <strong>{key}</strong>
                            {hasChildren && <span style={{ fontSize: '0.8em', marginLeft: '5px' }}>⤵</span>}
                        </td>
                        <td><code>{Array.isArray(prop.type) ? prop.type.join('|') : prop.type}</code></td>
                        <td style={{ textAlign: 'center' }}>{isReq ? '✅' : ''}</td>
                        <td>{prop.description || ''}</td>
                    </tr>
                );
            })}

            {/* RECURSION: Render nested tables inside a full-width row */}
            {nestedItems.map(({ key, prop }) => {
                const childProps = prop.type === 'object' ? prop.properties : prop.items.properties;
                const childReq = prop.type === 'object' ? prop.required : prop.items.required;
                const title = prop.type === 'array' ? `${key} [ ]` : `${key} { }`;

                return (
                    <tr key={`${key}-nested`}>
                        <td colSpan="4" style={{ paddingLeft: '20px', borderLeft: '4px solid #eee' }}>
                            <strong>{title}</strong>
                            <table style={{ width: '100%', marginTop: '5px' }}>
                                <thead>
                                    <tr>
                                        <th width="20%">Property</th>
                                        <th width="15%">Type</th>
                                        <th width="10%">Req</th>
                                        <th>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <SchemaRows properties={childProps} requiredList={childReq || []} level={level + 1} />
                                </tbody>
                            </table>
                        </td>
                    </tr>
                );
            })}
        </>
    );
};

// --- Main Exported Component ---
// Helper: Build an example payload from per-property `examples` or other hints


export default function SchemaViewer({ schema }) {

    return (
        <div>
            <h3>DataLayer Example</h3>
            <ExampleDataLayer schema={schema} />

            <h3>Event Properties</h3>
            <table>
                <thead>
                    <tr>
                        <th width="20%">Property</th>
                        <th width="15%">Type</th>
                        <th width="10%">Req</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    <SchemaRows properties={schema.properties} requiredList={schema.required} />
                </tbody>
            </table>

            {/* 3. Raw Source (Optional) */}
            <details>
                <summary>View Raw JSON Schema</summary>
                <CodeBlock language="json">{JSON.stringify(schema, null, 2)}</CodeBlock>
            </details>
        </div>
    );
}