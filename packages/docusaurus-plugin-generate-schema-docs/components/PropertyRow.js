import React from 'react';
import clsx from 'clsx';

// Helper to format the property type
const getPropertyType = (type) => {
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

const PropertyRow = ({ propertyKey, prop, requiredList, getConstraints }) => {
    const isReq = requiredList.includes(propertyKey);
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

export default PropertyRow;
