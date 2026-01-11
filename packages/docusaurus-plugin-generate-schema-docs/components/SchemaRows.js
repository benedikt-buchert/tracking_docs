import React from 'react';
import './SchemaRows.css';
import PropertyRow from './PropertyRow';
import OneOf from './OneOf';
import NestedTable from './NestedTable';

/**
 * Renders the rows of a schema properties table.
 * It iterates over the properties of a schema and renders a `PropertyRow` for each.
 * It also handles nested properties, `oneOf`, and `anyOf`.
 */
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

                        {/* Render a nested table for properties with children (objects or arrays of objects) */}
                        {hasChildren && !hasAnyOf && !hasOneOf && (
                            <NestedTable
                                propertyKey={key}
                                prop={prop}
                                level={level}
                                getConstraints={getConstraints}
                            />
                        )}

                        {/* Render a special component for oneOf and anyOf properties */}
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
