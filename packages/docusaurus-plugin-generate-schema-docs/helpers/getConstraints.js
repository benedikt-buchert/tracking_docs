// A list of JSON Schema keywords that have simple key-value constraints.
const constraintHandlers = {
    // Simple key-value constraints
    minLength: (val) => `minLength: ${val}`,
    maxLength: (val) => `maxLength: ${val}`,
    minimum: (val) => `minimum: ${val}`,
    maximum: (val) => `maximum: ${val}`,
    exclusiveMinimum: (val) => `exclusiveMinimum: ${val}`,
    exclusiveMaximum: (val) => `exclusiveMaximum: ${val}`,
    minItems: (val) => `minItems: ${val}`,
    maxItems: (val) => `maxItems: ${val}`,
    minProperties: (val) => `minProperties: ${val}`,
    maxProperties: (val) => `maxProperties: ${val}`,
    multipleOf: (val) => `multipleOf: ${val}`,
    format: (val) => `format: ${val}`,
    minContains: (val) => `minContains: ${val}`,
    maxContains: (val) => `maxContains: ${val}`,

    // Special-cased constraints
    pattern: (val) => `pattern: /${val}/`,
    uniqueItems: (val) => (val ? 'uniqueItems: true' : null),
    additionalProperties: (val) => (val === false ? 'additionalProperties: false' : null),
    propertyNames: (val) => `propertyNames: ${JSON.stringify(val)}`,
    dependentRequired: (val) => {
        const deps = Object.entries(val).map(([key, depVal]) => `${key} -> [${depVal.join(', ')}]`).join('; ');
        return `dependentRequired: ${deps}`;
    },
    contains: (val) => `contains: ${JSON.stringify(val)}`,
    enum: (val) => `enum: [${val.join(', ')}]`,
    const: (val) => `const: ${JSON.stringify(val)}`,
};

export const getConstraints = (prop, isReq) => {
    const constraints = [];
    if (isReq)
    {
        constraints.push('required');
    }

    for (const keyword in constraintHandlers)
    {
        if (prop[keyword] !== undefined)
        {
            const handler = constraintHandlers[keyword];
            const result = handler(prop[keyword]);
            if (result)
            {
                constraints.push(result);
            }
        }
    }
    return constraints;
};
