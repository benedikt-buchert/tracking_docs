import React from 'react';
import './SchemaRows.css';
import PropertyRow from './PropertyRow';
import TableHeader from './TableHeader';
import OneOf from './OneOf';

const SchemaRows = ({ properties, requiredList = [], level = 0, getConstraints }) => {
    if (!properties) {
        return null;
    }
    return (
        <>
            {Object.entries(properties).map(([key, prop]) => {
                const childProperties = prop.properties || (prop.items && prop.items.properties);
                const hasChildren = childProperties && Object.keys(childProperties).length > 0;
                const hasOneOf = prop.oneOf || (prop.items && prop.items.oneOf);
                const hasAnyOf = prop.anyOf || (prop.items && prop.items.anyOf);

                return (
                    <React.Fragment key={key}>
                        <PropertyRow
                            propertyKey={key}
                            prop={prop}
                            requiredList={requiredList}
                            level={level}
                            getConstraints={getConstraints}
                        />
                        {hasChildren && !hasAnyOf && !hasOneOf && (
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
                        {(hasOneOf || hasAnyOf) && (
                            <OneOf
                                schemas={hasOneOf ? prop.oneOf || prop.items.oneOf : prop.anyOf || prop.items.anyOf}
                                level={level}
                                getConstraints={getConstraints}
                                type={hasOneOf ? 'oneOf' : 'anyOf'}
                            />
                        )}
                    </React.Fragment>
                );
            })}
        </>
    );
};

export default SchemaRows;
