import { schemaToTableData } from '../../helpers/schemaToTableData';
import choiceEventSchema from '../__fixtures__/static/schemas/choice-event.json';
import rootAnyOfEventSchema from '../__fixtures__/static/schemas/root-any-of-event.json';

describe('schemaToTableData', () => {
  it('handles "oneOf" and "anyOf" correctly for a complex schema', () => {
    const tableData = schemaToTableData(choiceEventSchema);

    // Expect 3 top-level items: event property, user_id choice, payment_method property
    const topLevelRows = tableData.filter((row) => row.level === 0);
    expect(topLevelRows).toHaveLength(3);

    // 1. Test 'event' property
    const eventProp = tableData.find(
      (row) =>
        row.type === 'property' && row.name === 'event' && row.level === 0,
    );
    expect(eventProp).toBeDefined();
    expect(eventProp.propertyType).toBe('string');
    expect(eventProp.required).toBe(true);

    // 2. Test 'user_id' property (oneOf)
    const userIdChoice = tableData.find(
      (row) =>
        row.type === 'choice' &&
        row.path.length === 1 &&
        row.path[0] === 'user_id',
    );
    expect(userIdChoice).toBeDefined();
    expect(userIdChoice.level).toBe(0);
    expect(userIdChoice.choiceType).toBe('oneOf');
    expect(userIdChoice.options).toHaveLength(2);
    expect(userIdChoice.description).toBe("The user's ID.");

    // Check the options for user_id
    const userIdOption1 = userIdChoice.options[0];
    expect(userIdOption1.title).toBe('User ID as String');
    expect(userIdOption1.rows).toHaveLength(1);
    const userIdOption1Prop = userIdOption1.rows[0];
    expect(userIdOption1Prop.type).toBe('property');
    expect(userIdOption1Prop.name).toBe('user_id');
    expect(userIdOption1Prop.level).toBe(0);
    expect(userIdOption1Prop.required).toBe(true);

    const userIdOption2 = userIdChoice.options[1];
    expect(userIdOption2.title).toBe('User ID as Integer');
    const userIdOption2Prop = userIdOption2.rows[0];
    expect(userIdOption2Prop.name).toBe('user_id');
    expect(userIdOption2Prop.level).toBe(0);
    expect(userIdOption2Prop.required).toBe(true);

    // 3. Test 'payment_method' property (anyOf)
    const paymentMethodProp = tableData.find(
      (row) => row.name === 'payment_method' && row.level === 0,
    );
    expect(paymentMethodProp).toBeDefined();
    expect(paymentMethodProp.type).toBe('property');
    expect(paymentMethodProp.propertyType).toBe('object');
    expect(paymentMethodProp.required).toBe(true);

    const paymentMethodChoice = tableData.find(
      (row) =>
        row.type === 'choice' &&
        row.path.length === 2 &&
        row.path[0] === 'payment_method' &&
        row.path[1] === 'anyOf',
    );
    expect(paymentMethodChoice).toBeDefined();
    expect(paymentMethodChoice.level).toBe(1); // Should be nested
    expect(paymentMethodChoice.choiceType).toBe('anyOf');
    expect(paymentMethodChoice.options).toHaveLength(2);

    // Check the options for payment_method
    const paymentOption1 = paymentMethodChoice.options[0]; // Credit Card
    expect(paymentOption1.title).toBe('Credit Card');
    expect(paymentOption1.rows.length).toBe(3);
    const cardPaymentType = paymentOption1.rows.find(
      (r) => r.name === 'payment_type',
    );
    expect(cardPaymentType).toBeDefined();
    expect(cardPaymentType.level).toBe(1);
    expect(cardPaymentType.path).toEqual(['payment_type']);

    const paymentOption2 = paymentMethodChoice.options[1]; // PayPal
    expect(paymentOption2.title).toBe('PayPal');
    expect(paymentOption2.rows.length).toBe(2);
    const payPalEmail = paymentOption2.rows.find((r) => r.name === 'email');
    expect(payPalEmail).toBeDefined();
    expect(payPalEmail.level).toBe(1);
    expect(payPalEmail.path).toEqual(['email']);
  });

  it('handles schemas with both properties and oneOf', () => {
    const schema = {
      properties: {
        common_prop: { type: 'string' },
      },
      oneOf: [
        {
          title: 'Option A',
          properties: { prop_a: { type: 'string' } },
        },
      ],
    };

    const tableData = schemaToTableData(schema);

    // It should contain one property row and one choice row.
    expect(tableData).toHaveLength(2);

    const propRow = tableData.find((row) => row.type === 'property');
    const choiceRow = tableData.find((row) => row.type === 'choice');

    expect(propRow).toBeDefined();
    expect(propRow.name).toBe('common_prop');

    expect(choiceRow).toBeDefined();
    expect(choiceRow.choiceType).toBe('oneOf');
  });

  it('handles "oneOf" nested inside a property', () => {
    const schema = {
      properties: {
        user_id: {
          description: "The user's ID.",
          oneOf: [
            { title: 'User ID as String', type: 'string' },
            { title: 'User ID as Integer', type: 'integer' },
          ],
        },
      },
    };

    const tableData = schemaToTableData(schema);

    // Expect a single 'choice' row that correctly represents the property.
    expect(tableData).toHaveLength(1);

    const choiceRow = tableData[0];
    expect(choiceRow.type).toBe('choice');
    expect(choiceRow.level).toBe(0);
    expect(choiceRow.path).toEqual(['user_id']);
    expect(choiceRow.options).toHaveLength(2);
    expect(choiceRow.description).toBe("The user's ID.");

    // Check that the options' rows are generated correctly
    const firstOptionRows = choiceRow.options[0].rows;
    expect(firstOptionRows).toHaveLength(1);
    expect(firstOptionRows[0].type).toBe('property');
    expect(firstOptionRows[0].name).toBe('user_id');
    expect(firstOptionRows[0].propertyType).toBe('string');
  });

  it('handles "anyOf" at the root level correctly', () => {
    const tableData = schemaToTableData(rootAnyOfEventSchema);

    const topLevelRows = tableData.filter((row) => row.level === 0);
    // event property + the choice itself
    expect(topLevelRows).toHaveLength(2);

    // Test 'event' property
    const eventProp = tableData.find(
      (row) =>
        row.type === 'property' && row.name === 'event' && row.level === 0,
    );
    expect(eventProp).toBeDefined();

    const rootChoice = tableData.find(
      (row) => row.type === 'choice' && row.level === 0,
    );
    expect(rootChoice).toBeDefined();
    expect(rootChoice.choiceType).toBe('anyOf');
    expect(rootChoice.options).toHaveLength(2);

    const optionC = rootChoice.options.find((o) => o.title === 'Has Param C');
    expect(optionC).toBeDefined();
    expect(optionC.rows).toHaveLength(1);
    const paramC = optionC.rows[0];
    expect(paramC.name).toBe('param_c');
    expect(paramC.level).toBe(0); // This is the core of the test

    const optionD = rootChoice.options.find((o) => o.title === 'Has Param D');
    expect(optionD).toBeDefined();
    expect(optionD.rows).toHaveLength(1);
    const paramD = optionD.rows[0];
    expect(paramD.name).toBe('param_d');
    expect(paramD.level).toBe(0); // This is the core of the test
  });

  it('uses "const" as example if "examples" and "example" are not present', () => {
    const schema = {
      properties: {
        prop_with_const: {
          type: 'string',
          const: 'const-value',
        },
      },
    };

    const tableData = schemaToTableData(schema);
    expect(tableData[0].examples).toEqual(['const-value']);
  });

  it('uses "default" as example if "examples", "example", and "const" are not present', () => {
    const schema = {
      properties: {
        prop_with_default: {
          type: 'string',
          default: 'default-value',
        },
      },
    };

    const tableData = schemaToTableData(schema);
    expect(tableData[0].examples).toEqual(['default-value']);
  });
});
