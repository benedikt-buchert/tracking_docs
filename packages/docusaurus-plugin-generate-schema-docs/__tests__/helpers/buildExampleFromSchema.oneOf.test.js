import buildExampleFromSchema from '../../helpers/buildExampleFromSchema';

describe('buildExampleFromSchema with oneOf and anyOf', () => {
    const oneOfSchema = {
        type: 'object',
        properties: {
            user_id: {
                description: "The user's ID.",
                oneOf: [
                    {
                        type: 'string',
                        title: 'User ID as String',
                        description: "The user's ID as a string.",
                        examples: ['user-123'],
                    },
                    {
                        type: 'integer',
                        title: 'User ID as Integer',
                        description: "The user's ID as an integer.",
                        examples: [123],
                    },
                ],
            },
        },
    };

    const anyOfSchema = {
        type: 'object',
        properties: {
            payment_method: {
                description: "The user's payment method.",
                anyOf: [
                    {
                        title: 'Credit Card',
                        type: 'object',
                        properties: {
                            card_number: {
                                type: 'string',
                                examples: ['1234-5678-9012-3456'],
                            },
                            expiry_date: {
                                type: 'string',
                                examples: ['12/26'],
                            },
                        },
                        required: ['card_number', 'expiry_date'],
                    },
                    {
                        title: 'PayPal',
                        type: 'object',
                        properties: {
                            email: {
                                type: 'string',
                                format: 'email',
                                examples: ['test@example.com'],
                            },
                        },
                        required: ['email'],
                    },
                ],
            },
        },
    };

    it('should generate an example with the first oneOf option by default', () => {
        const example = buildExampleFromSchema(oneOfSchema);
        expect(example).toEqual({
            user_id: 'user-123',
        });
    });

    it('should generate an example with the chosen oneOf option', () => {
        const getChoice = () => 1; // Choose the second option
        const example = buildExampleFromSchema(oneOfSchema, getChoice);
        expect(example).toEqual({
            user_id: 123,
        });
    });

    it('should generate an example with the first anyOf option by default', () => {
        const example = buildExampleFromSchema(anyOfSchema);
        expect(example).toEqual({
            payment_method: {
                card_number: '1234-5678-9012-3456',
                expiry_date: '12/26',
            },
        });
    });

    it('should generate an example with the chosen anyOf option', () => {
        const getChoice = () => 1; // Choose the second option
        const example = buildExampleFromSchema(anyOfSchema, getChoice);
        expect(example).toEqual({
            payment_method: {
                email: 'test@example.com',
            },
        });
    });
});
