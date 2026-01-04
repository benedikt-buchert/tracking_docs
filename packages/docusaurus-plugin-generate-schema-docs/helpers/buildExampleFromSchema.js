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
export default buildExampleFromSchema;
