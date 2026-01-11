import React from 'react';
import clsx from 'clsx';

// Helper to format the property type
const getPropertyType = (type) => {
    if (!type) return '';
    return Array.isArray(type) ? type.join(' | ') : type;
};

// Helper to format examples
const formatExamples = (examples) => {
    if (!examples) {
        return '';
    }
    return examples
        .map((example) =>
            typeof example === 'object' ? JSON.stringify(example) : example
        )
        .join(', ');
};

/**
 * Renders a simplified row for properties that have `oneOf` or `anyOf`.
 * It displays the property key, a combined list of possible types, and the description.
 */
const OneOfAnyOfRow = ({ propertyKey, prop, isReq }) => {
    const choices = prop.oneOf || prop.anyOf || (prop.items && (prop.items.oneOf || prop.items.anyOf));
    const types = choices.map(choice => choice.type).filter(Boolean);
    const uniqueTypes = [...new Set(types)];

    return (
        <tr className={clsx(isReq && 'required-row')}>
            <td>
                <strong>{propertyKey}</strong>
            </td>
            <td><code>{getPropertyType(uniqueTypes)}</code></td>
            <td colSpan="3">{prop.description || ''}</td>
        </tr>
    );
};

/**
 * Renders a default row for a regular schema property.
 * It displays the property key, type, constraints, examples, and description.
 * It also handles nested properties by showing an indicator.
 */
const DefaultRow = ({ propertyKey, prop, isReq, getConstraints }) => {
    const constraints = getConstraints(prop, isReq);
    const childProperties = prop.properties || (prop.items && prop.items.properties);
    const hasChildren = childProperties && Object.keys(childProperties).length > 0;

    const isObject = prop.type === 'object';
    const isArrayOfObjects = prop.type === 'array' && prop.items && prop.items.type === 'object';

    if ((isObject || isArrayOfObjects) && !hasChildren) {
        return null;
    }

    const numRows = Math.max(1, constraints.length);
    const [firstConstraint, ...remainingConstraints] = constraints;

    return (
        <React.Fragment>
            <tr className={clsx(isReq && 'required-row')}>
                <td rowSpan={numRows}>
                    <strong>{propertyKey}</strong>
                    {hasChildren && <span style={{ fontSize: '0.8em', marginLeft: '5px' }}>⤵</span>}
                </td>
                <td rowSpan={numRows}><code>{getPropertyType(prop.type)}</code></td>
                <td>
                    {firstConstraint && (
                        <code className={clsx('constraint-code', firstConstraint === 'required' && 'required')}>
                            {firstConstraint}
                        </code>
                    )}
                </td>
                <td rowSpan={numRows}>
                    {formatExamples(prop.examples)}
                </td>
                <td rowSpan={numRows}>{prop.description || ''}</td>
            </tr>

            {remainingConstraints.map((constraint, index) => (
                <tr className={clsx(isReq && 'required-row')} key={`${propertyKey}-constraint-${index}`}>
                    <td>
                        <code className={clsx('constraint-code', constraint === 'required' && 'required')}>
                            {constraint}
                        </code>
                    </td>
                </tr>
            ))}
        </React.Fragment>
    );
};

/**
 * Renders a single row in the properties table.
 * It determines whether the property is a regular property or a `oneOf`/`anyOf` property
 * and renders the appropriate component.
 */
const PropertyRow = ({ propertyKey, prop, requiredList, getConstraints }) => {
    const isReq = requiredList.includes(propertyKey);
    const hasOneOf = prop.oneOf || (prop.items && prop.items.oneOf);
    const hasAnyOf = prop.anyOf || (prop.items && prop.items.anyOf);

    if (hasOneOf || hasAnyOf) {
        return <OneOfAnyOfRow propertyKey={propertyKey} prop={prop} isReq={isReq} />;
    }

    return <DefaultRow propertyKey={propertyKey} prop={prop} isReq={isReq} getConstraints={getConstraints} />;
};

export default PropertyRow;
