import { schemaToExamples } from '../../helpers/schemaToExamples';
import choiceEventSchema from '../__fixtures__/static/schemas/choice-event.json';
import conditionalEventSchema from '../__fixtures__/static/schemas/conditional-event.json';
import nestedConditionalEventSchema from '../__fixtures__/static/schemas/nested-conditional-event.json';

describe('schemaToExamples', () => {
  it('should generate examples for all options in a complex schema', () => {
    const exampleGroups = schemaToExamples(choiceEventSchema);

    // Should find two choice points: user_id and payment_method
    expect(exampleGroups).toHaveLength(2);

    // Find the user_id group
    const userIdGroup = exampleGroups.find(
      (group) => group.property === 'user_id',
    );
    expect(userIdGroup).toBeDefined();
    expect(userIdGroup.options).toHaveLength(2); // String and Integer

    // Find the payment_method group
    const paymentMethodGroup = exampleGroups.find(
      (group) => group.property === 'payment_method',
    );
    expect(paymentMethodGroup).toBeDefined();
    expect(paymentMethodGroup.options).toHaveLength(2); // Credit Card and PayPal

    // Check the Credit Card example
    const creditCardOption = paymentMethodGroup.options.find(
      (opt) => opt.title === 'Credit Card',
    );
    expect(creditCardOption).toBeDefined();
    expect(creditCardOption.example).toHaveProperty('payment_method');
    expect(creditCardOption.example.payment_method).toHaveProperty(
      'card_number',
    );

    // Check the PayPal example
    const payPalOption = paymentMethodGroup.options.find(
      (opt) => opt.title === 'PayPal',
    );
    expect(payPalOption).toBeDefined();
    expect(payPalOption.example).toHaveProperty('payment_method');
    expect(payPalOption.example.payment_method).toHaveProperty('email');

    // Check the user_id examples
    const userIdStringOption = userIdGroup.options.find(
      (opt) => opt.title === 'User ID as String',
    );
    expect(userIdStringOption).toBeDefined();
    expect(userIdStringOption.example).toHaveProperty('payment_method');

    const userIdIntegerOption = userIdGroup.options.find(
      (opt) => opt.title === 'User ID as Integer',
    );
    expect(userIdIntegerOption).toBeDefined();
    expect(userIdIntegerOption.example).toHaveProperty('payment_method');
  });

  describe('if/then/else conditional examples', () => {
    it('generates two examples for schema with if/then/else', () => {
      const groups = schemaToExamples(conditionalEventSchema);
      const conditionalGroup = groups.find((g) => g.property === 'conditional');
      expect(conditionalGroup).toBeDefined();
      expect(conditionalGroup.options).toHaveLength(2);
    });

    it('then example includes then properties merged with base', () => {
      const groups = schemaToExamples(conditionalEventSchema);
      const conditionalGroup = groups.find((g) => g.property === 'conditional');
      const thenOption = conditionalGroup.options.find(
        (o) => o.title === 'When condition is met',
      );
      expect(thenOption).toBeDefined();
      expect(thenOption.example).toHaveProperty('event');
      expect(thenOption.example).toHaveProperty('postal_code', '90210');
      expect(thenOption.example).toHaveProperty('state', 'CA');
    });

    it('else example includes else properties merged with base', () => {
      const groups = schemaToExamples(conditionalEventSchema);
      const conditionalGroup = groups.find((g) => g.property === 'conditional');
      const elseOption = conditionalGroup.options.find(
        (o) => o.title === 'When condition is not met',
      );
      expect(elseOption).toBeDefined();
      expect(elseOption.example).toHaveProperty('event');
      expect(elseOption.example).toHaveProperty('postal_code', 'K1A 0B1');
      expect(elseOption.example).not.toHaveProperty('state');
    });

    it('generates only one example when else is absent', () => {
      const schema = {
        type: 'object',
        properties: {
          status: { type: 'string', examples: ['active'] },
        },
        if: { properties: { status: { const: 'active' } } },
        then: {
          properties: {
            active_since: { type: 'string', examples: ['2024-01-01'] },
          },
        },
      };
      const groups = schemaToExamples(schema);
      const conditionalGroup = groups.find((g) => g.property === 'conditional');
      expect(conditionalGroup).toBeDefined();
      expect(conditionalGroup.options).toHaveLength(1);
      expect(conditionalGroup.options[0].title).toBe('When condition is met');
    });

    it('detects nested conditional points inside properties', () => {
      const groups = schemaToExamples(nestedConditionalEventSchema);
      const conditionalGroup = groups.find((g) => g.property === 'conditional');
      expect(conditionalGroup).toBeDefined();
      expect(conditionalGroup.options).toHaveLength(2);

      const thenOption = conditionalGroup.options.find(
        (o) => o.title === 'When condition is met',
      );
      expect(thenOption.example.shipping).toHaveProperty(
        'priority_level',
        'high',
      );

      const elseOption = conditionalGroup.options.find(
        (o) => o.title === 'When condition is not met',
      );
      expect(elseOption.example.shipping).toHaveProperty('estimated_days', 5);
    });
  });
});
