import React from 'react';
import './SchemaRows.css';
import PropertyRow from './PropertyRow';
import TableHeader from './TableHeader';

const SchemaRows = ({ properties, requiredList = [], level = 0, getConstraints }) => {
    return (
        <>
            {Object.entries(properties).map(([key, prop]) => {
                const childProperties = prop.properties || (prop.items && prop.items.properties);
                const hasChildren = childProperties && Object.keys(childProperties).length > 0;

                return (
                    <React.Fragment key={key}>
                        <PropertyRow
                            propertyKey={key}
                            prop={prop}
                            requiredList={requiredList}
                            level={level}
                            getConstraints={getConstraints}
                        />
                        {hasChildren && (
                            <tr key={`${key}-nested`}>
                                <td colSpan="5" className="nested-table-container">
                                    <strong>{prop.type === 'array' ? `${key} [ ]` : `${key} { }`}</strong>
                                    <table style={{ width: '100%', marginTop: '5px' }}>
                                        <TableHeader />
                                        <tbody>
                                            <SchemaRows
                                                properties={prop.type === 'object' ? prop.properties : prop.items.properties}
                                                requiredList={prop.type === 'object' ? prop.required || [] : prop.items.required || []}
                                                level={level + 1}
                                                getConstraints={getConstraints}
                                            />
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        )}
                    </React.Fragment>
                );
            })}
        </>
    );
};

export default SchemaRows;