import React from 'react';
import SchemaRows from './SchemaRows';
import TableHeader from './TableHeader';

const NestedTable = ({ propertyKey, prop, level, getConstraints }) => {
    return (
        <tr key={`${propertyKey}-nested`}>
            <td colSpan="5" className="nested-table-container">
                <strong>{prop.type === 'array' ? `${propertyKey} [ ]` : `${propertyKey} { }`}</strong>
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
    );
};

export default NestedTable;
