import React from 'react';

const SchemaRows = ({ properties, requiredList = [], level = 0 }) => {
    return (
        <>
            {Object.entries(properties).map(([key, prop]) => {
                const isReq = requiredList.includes(key);
                const hasChildren = (prop.type === 'object' && prop.properties) ||
                    (prop.type === 'array' && prop.items && prop.items.properties);

                return (
                    <React.Fragment key={key}>
                        {/* Main property row */}
                        <tr style={{ backgroundColor: isReq ? 'rgba(255,0,0,0.05)' : 'transparent' }}>
                            <td>
                                <strong>{key}</strong>
                                {hasChildren && <span style={{ fontSize: '0.8em', marginLeft: '5px' }}>⤵</span>}
                            </td>
                            <td><code>{Array.isArray(prop.type) ? prop.type.join('|') : prop.type}</code></td>
                            <td style={{ textAlign: 'center' }}>{isReq ? '✅' : ''}</td>
                            <td>{prop.examples ? prop.examples.join(', ') : ''}</td>
                            <td>{prop.description || ''}</td>
                        </tr>

                        {/* Nested children rendered immediately after parent */}
                        {hasChildren && (
                            <tr>
                                <td colSpan="5" style={{ paddingLeft: '20px', borderLeft: '4px solid #eee' }}>
                                    <strong>{prop.type === 'array' ? `${key} [ ]` : `${key} { }`}</strong>
                                    <table style={{ width: '100%', marginTop: '5px' }}>
                                        <thead>
                                            <tr>
                                                <th width="20%">Property</th>
                                                <th width="15%">Type</th>
                                                <th width="10%">Req</th>
                                                <th width="15%">Examples</th>
                                                <th>Description</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <SchemaRows
                                                properties={prop.type === 'object' ? prop.properties : prop.items.properties}
                                                requiredList={prop.type === 'object' ? prop.required || [] : prop.items.required || []}
                                                level={level + 1}
                                            />
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        )
                        }
                    </React.Fragment >
                );
            })}
        </>
    );
};

export default SchemaRows;