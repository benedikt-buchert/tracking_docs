import React from 'react';
import clsx from 'clsx';

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

    return (
        <React.Fragment>
            <tr className={clsx(isReq && 'required-row')}>
                <td rowSpan={numRows}>
                    <strong>{propertyKey}</strong>
                    {hasChildren && <span style={{ fontSize: '0.8em', marginLeft: '5px' }}>⤵</span>}
                </td>
                <td rowSpan={numRows}><code>{Array.isArray(prop.type) ? prop.type.join('|') : prop.type}</code></td>
                <td>
                    {constraints.length > 0 && (
                        <code className={clsx('constraint-code', constraints[0] === 'required' && 'required')}>
                            {constraints[0]}
                        </code>
                    )}
                </td>
                <td rowSpan={numRows}>{prop.examples ? prop.examples.join(', ') : ''}</td>
                <td rowSpan={numRows}>{prop.description || ''}</td>
            </tr>

            {constraints.slice(1).map((constraint, index) => (
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
