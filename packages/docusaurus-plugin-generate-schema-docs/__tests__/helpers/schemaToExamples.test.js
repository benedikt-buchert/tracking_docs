import { schemaToExamples } from '../../helpers/schemaToExamples';
import choiceEventSchema from '../__fixtures__/schemas/choice-event.json';

describe('schemaToExamples', () => {
    it('should generate examples for all options in a complex schema', () => {
        const exampleGroups = schemaToExamples(choiceEventSchema);

        // Should find two choice points: user_id and payment_method
        expect(exampleGroups).toHaveLength(2);

        // Find the user_id group
        const userIdGroup = exampleGroups.find(group => group.property === 'user_id');
        expect(userIdGroup).toBeDefined();
        expect(userIdGroup.options).toHaveLength(2); // String and Integer

        // Find the payment_method group
        const paymentMethodGroup = exampleGroups.find(group => group.property === 'payment_method');
        expect(paymentMethodGroup).toBeDefined();
        expect(paymentMethodGroup.options).toHaveLength(2); // Credit Card and PayPal

        // Check the Credit Card example
        const creditCardOption = paymentMethodGroup.options.find(opt => opt.title === 'Credit Card');
        expect(creditCardOption).toBeDefined();
        expect(creditCardOption.example).toHaveProperty('payment_method');
        expect(creditCardOption.example.payment_method).toHaveProperty('card_number');

        // Check the PayPal example
        const payPalOption = paymentMethodGroup.options.find(opt => opt.title === 'PayPal');
        expect(payPalOption).toBeDefined();
        expect(payPalOption.example).toHaveProperty('payment_method');
        expect(payPalOption.example.payment_method).toHaveProperty('email');

        // Check the user_id examples
        const userIdStringOption = userIdGroup.options.find(opt => opt.title === 'User ID as String');
        expect(userIdStringOption).toBeDefined();
        expect(userIdStringOption.example).toHaveProperty('payment_method');

        const userIdIntegerOption = userIdGroup.options.find(opt => opt.title === 'User ID as Integer');
        expect(userIdIntegerOption).toBeDefined();
        expect(userIdIntegerOption.example).toHaveProperty('payment_method');
    });
});
