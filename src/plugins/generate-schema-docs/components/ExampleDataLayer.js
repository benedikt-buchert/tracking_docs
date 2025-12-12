import CodeBlock from '@theme/CodeBlock';

export default function ExampleDataLayer({ schema }) {
    // 1. Identify properties that need to be reset (cleared) first
    const propertiesToReset = findComplexPropertiesToReset(schema || {});

    // 2. Build the main example data
    const example = buildExampleFromSchema(schema || {});

    // 3. Construct the code snippet
    let codeSnippet = '';

    // If there are properties to reset, push them as null first
    if (propertiesToReset.length > 0)
    {
        const resetObject = {};
        propertiesToReset.forEach(prop => {
            resetObject[prop] = null;
        });
        codeSnippet += `window.dataLayer.push(${JSON.stringify(resetObject, null, 2)});\n`;
    }

    // Append the main data payload
    codeSnippet += `window.dataLayer.push(${JSON.stringify(example, null, 2)});`;

    return <CodeBlock language="javascript">{codeSnippet}</CodeBlock>
};

const findComplexPropertiesToReset = (schema) => {
    if (!schema || !schema.properties) return [];

    return Object.entries(schema.properties)
        .filter(([key, definition]) => definition["x-gtm-clear"] === true)
        .map(([key]) => key);
}

const buildExampleFromSchema = (schema) => {
    const buildValue = (prop) => {
        if (!prop) return undefined;

        // 1. Prefer explicit examples or constants if available
        if (prop.examples && prop.examples.length) return prop.examples[0];
        if (prop.const !== undefined) return prop.const;
        if (prop.default !== undefined) return prop.default;

        const type = Array.isArray(prop.type) ? prop.type[0] : prop.type;

        if (type === 'object')
        {
            if (prop.properties)
            {
                const obj = {};
                Object.entries(prop.properties).forEach(([k, v]) => {
                    const val = buildValue(v);
                    // Only add the property if it has a valid value (not undefined)
                    if (val !== undefined)
                    {
                        obj[k] = val;
                    }
                });

                // If the object ends up having no keys, consider it "empty" and return undefined
                if (Object.keys(obj).length === 0) return undefined;
                return obj;
            }
            // Object with no properties defined
            return undefined;
        }

        if (type === 'array')
        {
            if (prop.items)
            {
                const itemVal = buildValue(prop.items);
                // If the inner item is valid, return it as an array
                if (itemVal !== undefined)
                {
                    return [itemVal];
                }
            }
            // Empty array or array of undefined items
            return undefined;
        }

        switch (type)
        {
            case 'string': return '';
            case 'integer':
            case 'number': return 0;
            case 'boolean': return false;
            default: return undefined;
        }
    };

    // If the schema provides a top-level examples array with an object, prefer it
    if (schema && schema.examples && schema.examples.length)
    {
        const first = schema.examples[0];
        if (typeof first === 'object' && first !== null) return first;
    }

    // Otherwise, build from properties
    if (schema && schema.properties)
    {
        const out = {};
        Object.entries(schema.properties).forEach(([k, p]) => {
            const val = buildValue(p);
            // Only add top-level keys if they are not undefined
            if (val !== undefined)
            {
                out[k] = val;
            }
        });
        return out;
    }

    return {};
}