import buildExampleFromSchema from '../../helpers/buildExampleFromSchema.js';

describe('buildExampleFromSchema', () => {
    it('should build a basic example from a schema', () => {
        const schema = {
            type: 'object',
            properties: {
                name: { type: 'string' },
                age: { type: 'integer' },
                isStudent: { type: 'boolean' },
            },
        };

        const example = buildExampleFromSchema(schema);

        expect(example).toEqual({
            name: '',
            age: 0,
            isStudent: false,
        });
    });

    it('should handle nested objects and arrays', () => {
        const schema = {
            type: 'object',
            properties: {
                user: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                    },
                },
                posts: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            title: { type: 'string' },
                            tags: {
                                type: 'array',
                                items: { type: 'string' },
                            },
                        },
                    },
                },
            },
        };

        const example = buildExampleFromSchema(schema);

        expect(example).toEqual({
            user: {
                name: '',
            },
            posts: [
                {
                    title: '',
                    tags: [''],
                },
            ],
        });
    });

    it('should use examples, const, and default values', () => {
        const schema = {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    examples: ['John Doe'],
                },
                role: {
                    type: 'string',
                    const: 'admin',
                },
                level: {
                    type: 'integer',
                    default: 1,
                },
            },
        };

        const example = buildExampleFromSchema(schema);

        expect(example).toEqual({
            name: 'John Doe',
            role: 'admin',
            level: 1,
        });
    });

    it('should build a complex example', () => {
        const schema = {
            type: 'object',
            properties: {
                event: {
                    type: 'string',
                    examples: ['purchase'],
                },
                ecommerce: {
                    type: 'object',
                    properties: {
                        transaction_id: {
                            type: 'string',
                            examples: ['T_12345'],
                        },
                        value: {
                            type: 'number',
                            default: 10.0,
                        },
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    item_id: { type: 'string', examples: ['SKU_123'] },
                                    item_name: { type: 'string', examples: ['Stan Smith Shoes'] },
                                    price: { type: 'number' },
                                    quantity: { type: 'integer', default: 1 },
                                },
                            },
                        },
                    },
                },
            },
        };

        const example = buildExampleFromSchema(schema);

        expect(example).toEqual({
            event: 'purchase',
            ecommerce: {
                transaction_id: 'T_12345',
                value: 10.0,
                items: [
                    {
                        item_id: 'SKU_123',
                        item_name: 'Stan Smith Shoes',
                        price: 0,
                        quantity: 1,
                    },
                ],
            },
        });
    });
});
