import { schemaToTableData } from '../../helpers/schemaToTableData';
import battleTestSchema from '../__fixtures__/static/schemas/battle-test-event.json';

/**
 * Comprehensive integration test for the battle-test-event schema.
 * This schema exercises every nesting combination:
 * - oneOf/anyOf inside if/then/else
 * - if/then/else inside oneOf/anyOf branches
 * - nested conditionals inside conditionals
 * - array items with conditionals and choices
 * - deeply nested objects
 *
 * Tests verify: type, level, path, isLastInGroup, hasChildren,
 * containerType, continuingLevels, and groupBrackets for every row.
 */
describe('schemaToTableData – battle-test-event integration', () => {
  let rows;

  beforeAll(() => {
    rows = schemaToTableData(battleTestSchema);
  });

  // Helper to find a row by name at a specific level in a flat array
  const findRow = (data, name, level) =>
    data.find((r) => r.name === name && r.level === level);
  const findByPath = (data, path) =>
    data.find((r) => JSON.stringify(r.path) === JSON.stringify(path));

  // Shorthand bracket descriptor
  const B = (level, bracketIndex) => ({ level, bracketIndex });

  describe('top-level structure', () => {
    it('produces 26 top-level rows', () => {
      expect(rows).toHaveLength(26);
    });

    it('has the correct top-level row order', () => {
      const topLevelNames = rows
        .filter((r) => r.level === 0 && r.type === 'property')
        .map((r) => r.name);
      expect(topLevelNames).toEqual([
        '$schema',
        'event',
        'user',
        'items',
        'payment',
        'fulfillment',
        'discount',
        'metadata',
      ]);
    });

    it('marks the last top-level property as not-last (conditional follows)', () => {
      const metadata = findRow(rows, 'metadata', 0);
      expect(metadata.isLastInGroup).toBe(false);
    });

    it('has a root-level conditional as the last row', () => {
      const lastRow = rows[rows.length - 1];
      expect(lastRow.type).toBe('conditional');
      expect(lastRow.level).toBe(0);
      expect(lastRow.isLastInGroup).toBe(true);
    });
  });

  describe('root-level property attributes', () => {
    it.each([
      ['$schema', { hasChildren: false, containerType: null, contLvls: [] }],
      ['event', { hasChildren: false, containerType: null, contLvls: [] }],
      ['user', { hasChildren: true, containerType: 'object', contLvls: [] }],
      ['items', { hasChildren: true, containerType: 'array', contLvls: [] }],
      ['payment', { hasChildren: true, containerType: 'object', contLvls: [] }],
      [
        'fulfillment',
        { hasChildren: true, containerType: 'object', contLvls: [] },
      ],
      [
        'discount',
        { hasChildren: true, containerType: 'object', contLvls: [] },
      ],
      [
        'metadata',
        { hasChildren: true, containerType: 'object', contLvls: [] },
      ],
    ])('%s has correct attributes', (name, expected) => {
      const row = findRow(rows, name, 0);
      expect(row.hasChildren).toBe(expected.hasChildren);
      expect(row.containerType).toBe(expected.containerType);
      expect(row.continuingLevels).toEqual(expected.contLvls);
      expect(row.groupBrackets).toEqual([]);
    });
  });

  describe('user section – if/then/else with oneOf inside then', () => {
    it('user children: account_type, user_id (simple choice), conditional', () => {
      const accountType = findByPath(rows, ['user', 'account_type']);
      expect(accountType.type).toBe('property');
      expect(accountType.level).toBe(1);
      expect(accountType.isLastInGroup).toBe(false);
      expect(accountType.continuingLevels).toEqual([0]);

      const userId = findByPath(rows, ['user', 'user_id']);
      expect(userId.type).toBe('choice');
      expect(userId.choiceType).toBe('oneOf');
      expect(userId.level).toBe(1);
      expect(userId.isLastInGroup).toBe(false);
      expect(userId.name).toBe('user_id');

      const conditional = findByPath(rows, ['user', 'if/then/else']);
      expect(conditional.type).toBe('conditional');
      expect(conditional.level).toBe(1);
      expect(conditional.isLastInGroup).toBe(true);
      expect(conditional.continuingLevels).toEqual([0, 1]);
    });

    it('user_id simple choice has scalar options with correct brackets', () => {
      const userId = findByPath(rows, ['user', 'user_id']);
      expect(userId.options).toHaveLength(2);

      const stringOpt = userId.options[0];
      expect(stringOpt.title).toBe('String ID');
      expect(stringOpt.rows).toHaveLength(1);
      expect(stringOpt.rows[0].name).toBe('user_id');
      expect(stringOpt.rows[0].isLastInGroup).toBe(false);
      expect(stringOpt.rows[0].continuingLevels).toEqual([0, 1]);
      expect(stringOpt.rows[0].groupBrackets).toEqual([B(1, 0)]);

      const intOpt = userId.options[1];
      expect(intOpt.title).toBe('Integer ID');
      expect(intOpt.rows[0].isLastInGroup).toBe(true);
    });

    it('user conditional – condition rows', () => {
      const conditional = findByPath(rows, ['user', 'if/then/else']);
      const condRows = conditional.condition.rows;
      expect(condRows).toHaveLength(1);
      expect(condRows[0].name).toBe('account_type');
      expect(condRows[0].isCondition).toBe(true);
      expect(condRows[0].isLastInGroup).toBe(false); // branches always follow condition rows
      expect(condRows[0].groupBrackets).toEqual([B(1, 0)]);
    });

    it('user conditional – Then branch with contact_method (complex choice)', () => {
      const conditional = findByPath(rows, ['user', 'if/then/else']);
      const thenBranch = conditional.branches[0];
      expect(thenBranch.title).toBe('Then');

      const loyalty = findRow(thenBranch.rows, 'loyalty_tier', 1);
      expect(loyalty).toBeDefined();
      expect(loyalty.isLastInGroup).toBe(false);
      expect(loyalty.groupBrackets).toEqual([B(1, 0)]);

      const contactMethod = findRow(thenBranch.rows, 'contact_method', 1);
      expect(contactMethod.type).toBe('property');
      expect(contactMethod.hasChildren).toBe(true);
      expect(contactMethod.isLastInGroup).toBe(false);

      // contact_method has a nested choice row at level 2
      const contactChoice = thenBranch.rows.find(
        (r) => r.type === 'choice' && r.path.includes('oneOf'),
      );
      expect(contactChoice.level).toBe(2);
      expect(contactChoice.choiceType).toBe('oneOf');
      expect(contactChoice.options).toHaveLength(2);
      expect(contactChoice.groupBrackets).toEqual([B(1, 0)]);

      // Email Contact option rows
      const emailOpt = contactChoice.options[0];
      expect(emailOpt.title).toBe('Email Contact');
      const emailAddr = emailOpt.rows.find((r) => r.name === 'email_address');
      expect(emailAddr.level).toBe(2);
      expect(emailAddr.groupBrackets).toEqual([B(1, 0), B(2, 1)]);
      expect(emailAddr.continuingLevels).toEqual([0, 1]);

      // SMS Contact – phone_number is last in last option
      const smsOpt = contactChoice.options[1];
      const phoneNumber = smsOpt.rows.find((r) => r.name === 'phone_number');
      expect(phoneNumber.isLastInGroup).toBe(true);
      expect(phoneNumber.groupBrackets).toEqual([B(1, 0), B(2, 1)]);
    });

    it('user conditional – Then branch preferences with nested conditional', () => {
      const conditional = findByPath(rows, ['user', 'if/then/else']);
      const thenBranch = conditional.branches[0];

      const preferences = findRow(thenBranch.rows, 'preferences', 1);
      expect(preferences.isLastInGroup).toBe(false); // then branch has else, so last prop isn't truly last
      expect(preferences.hasChildren).toBe(true);
      expect(preferences.containerType).toBe('object');
      expect(preferences.continuingLevels).toEqual([0]);

      // Nested conditional inside preferences
      const prefsConditional = thenBranch.rows.find(
        (r) =>
          r.type === 'conditional' && r.path.join('.').includes('preferences'),
      );
      expect(prefsConditional.level).toBe(2);
      expect(prefsConditional.continuingLevels).toEqual([0, 1, 2]);
      expect(prefsConditional.groupBrackets).toEqual([B(1, 0)]);

      // Condition row for marketing_consent
      expect(prefsConditional.condition.rows[0].name).toBe('marketing_consent');
      expect(prefsConditional.condition.rows[0].groupBrackets).toEqual([
        B(1, 0),
        B(2, 1),
      ]);

      // Then branch: frequency + topics
      const prefsThen = prefsConditional.branches[0];
      expect(prefsThen.rows).toHaveLength(2);
      expect(prefsThen.rows[0].name).toBe('frequency');
      expect(prefsThen.rows[1].name).toBe('topics');

      // Else branch: opt_out_reason
      const prefsElse = prefsConditional.branches[1];
      expect(prefsElse.rows).toHaveLength(1);
      expect(prefsElse.rows[0].name).toBe('opt_out_reason');
    });

    it('user conditional – Else branch with session_id', () => {
      const conditional = findByPath(rows, ['user', 'if/then/else']);
      const elseBranch = conditional.branches[1];
      expect(elseBranch.title).toBe('Else');
      expect(elseBranch.rows).toHaveLength(1);
      expect(elseBranch.rows[0].name).toBe('session_id');
      expect(elseBranch.rows[0].groupBrackets).toEqual([B(1, 0)]);
    });
  });

  describe('items section – array with if/then/else in items', () => {
    it('items properties + conditional at correct levels', () => {
      const itemType = findByPath(rows, ['items', '[n]', 'item_type']);
      expect(itemType.level).toBe(1);
      expect(itemType.isLastInGroup).toBe(false);
      expect(itemType.continuingLevels).toEqual([0]);

      const quantity = findByPath(rows, ['items', '[n]', 'quantity']);
      expect(quantity.isLastInGroup).toBe(false);
      expect(quantity.continuingLevels).toEqual([0]);

      const itemsConditional = findByPath(rows, [
        'items',
        '[n]',
        'if/then/else',
      ]);
      expect(itemsConditional.type).toBe('conditional');
      expect(itemsConditional.level).toBe(1);
    });

    it('items Then branch – physical items with shipping_class (complex choice)', () => {
      const itemsConditional = findByPath(rows, [
        'items',
        '[n]',
        'if/then/else',
      ]);
      const thenBranch = itemsConditional.branches[0];
      expect(thenBranch.title).toBe('Then');

      const weightKg = thenBranch.rows.find((r) => r.name === 'weight_kg');
      expect(weightKg.level).toBe(1);

      const dimensions = thenBranch.rows.find((r) => r.name === 'dimensions');
      expect(dimensions.hasChildren).toBe(true);
      expect(dimensions.containerType).toBe('object');

      // height is last child of dimensions
      const height = thenBranch.rows.find((r) => r.name === 'height');
      expect(height.level).toBe(2);
      expect(height.isLastInGroup).toBe(true);

      // shipping_class is a complex choice (property + nested choice row)
      const shippingClass = thenBranch.rows.find(
        (r) => r.name === 'shipping_class',
      );
      expect(shippingClass.type).toBe('property');
      expect(shippingClass.hasChildren).toBe(true);

      const shippingChoice = thenBranch.rows.find(
        (r) => r.type === 'choice' && r.path.includes('oneOf'),
      );
      expect(shippingChoice.choiceType).toBe('oneOf');
      expect(shippingChoice.options).toHaveLength(2);
    });

    it('items Else branch – digital items', () => {
      const itemsConditional = findByPath(rows, [
        'items',
        '[n]',
        'if/then/else',
      ]);
      const elseBranch = itemsConditional.branches[1];
      expect(elseBranch.title).toBe('Else');

      const downloadUrl = elseBranch.rows.find(
        (r) => r.name === 'download_url',
      );
      expect(downloadUrl).toBeDefined();
      const licenseType = elseBranch.rows.find(
        (r) => r.name === 'license_type',
      );
      expect(licenseType.isLastInGroup).toBe(true);
    });
  });

  describe('payment section – anyOf with if/then/else inside branch', () => {
    it('payment has currency property + anyOf choice', () => {
      const currency = findByPath(rows, ['payment', 'currency']);
      expect(currency.level).toBe(1);
      expect(currency.isLastInGroup).toBe(false);
      expect(currency.continuingLevels).toEqual([0]);

      const paymentChoice = rows.find(
        (r) =>
          r.type === 'choice' &&
          r.path[0] === 'payment' &&
          r.choiceType === 'anyOf',
      );
      expect(paymentChoice.level).toBe(1);
      expect(paymentChoice.options).toHaveLength(3);
    });

    it('Credit Card option has if/then/else (conditional inside choice)', () => {
      const paymentChoice = rows.find(
        (r) =>
          r.type === 'choice' &&
          r.path[0] === 'payment' &&
          r.choiceType === 'anyOf',
      );
      const creditCard = paymentChoice.options[0];
      expect(creditCard.title).toBe('Credit Card');

      // Credit card has properties + conditional
      const cardBrand = creditCard.rows.find((r) => r.name === 'card_brand');
      expect(cardBrand.level).toBe(1);

      const cardConditional = creditCard.rows.find(
        (r) => r.type === 'conditional',
      );
      expect(cardConditional).toBeDefined();
      expect(cardConditional.level).toBe(1);

      // Condition checks card_brand
      expect(cardConditional.condition.rows[0].name).toBe('card_brand');
      // Nested brackets: parent anyOf bracket + this conditional's bracket
      expect(cardConditional.condition.rows[0].groupBrackets).toEqual([
        B(1, 0),
        B(1, 1),
      ]);

      // Then: cid for Amex
      const thenBranch = cardConditional.branches[0];
      expect(thenBranch.rows[0].name).toBe('cid');

      // Else: cvv for non-Amex
      const elseBranch = cardConditional.branches[1];
      expect(elseBranch.rows[0].name).toBe('cvv');
    });

    it('Digital Wallet option has wallet_provider (simple choice)', () => {
      const paymentChoice = rows.find(
        (r) =>
          r.type === 'choice' &&
          r.path[0] === 'payment' &&
          r.choiceType === 'anyOf',
      );
      const digitalWallet = paymentChoice.options[1];
      expect(digitalWallet.title).toBe('Digital Wallet');

      const walletProvider = digitalWallet.rows.find(
        (r) => r.type === 'choice' && r.name === 'wallet_provider',
      );
      expect(walletProvider).toBeDefined();
      expect(walletProvider.choiceType).toBe('oneOf');
      // Simple choice: scalar options, no property row
      expect(walletProvider.options).toHaveLength(2);
    });
  });

  describe('fulfillment section – anyOf with nested conditional and nested anyOf', () => {
    it('Home Delivery option has address with nested conditional', () => {
      const fulfillmentChoice = rows.find(
        (r) => r.type === 'choice' && r.path[0] === 'fulfillment',
      );
      const homeDelivery = fulfillmentChoice.options[0];
      expect(homeDelivery.title).toBe('Home Delivery');

      const address = homeDelivery.rows.find((r) => r.name === 'address');
      expect(address.hasChildren).toBe(true);
      expect(address.containerType).toBe('object');

      // Address has country, city, street + conditional
      const addressConditional = homeDelivery.rows.find(
        (r) => r.type === 'conditional',
      );
      expect(addressConditional.level).toBe(2);
      expect(addressConditional.groupBrackets).toEqual([B(1, 0)]);

      // Condition checks country
      expect(addressConditional.condition.rows[0].name).toBe('country');
      expect(addressConditional.condition.rows[0].groupBrackets).toEqual([
        B(1, 0),
        B(2, 1),
      ]);

      // Then: customs_declaration with nested properties
      const thenBranch = addressConditional.branches[0];
      const customs = thenBranch.rows.find(
        (r) => r.name === 'customs_declaration',
      );
      expect(customs.hasChildren).toBe(true);
      expect(customs.containerType).toBe('object');

      const declaredValue = thenBranch.rows.find(
        (r) => r.name === 'declared_value',
      );
      expect(declaredValue.level).toBe(3);
      expect(declaredValue.groupBrackets).toEqual([B(1, 0), B(2, 1)]);

      // Else: zip_plus_four
      const elseBranch = addressConditional.branches[1];
      expect(elseBranch.rows[0].name).toBe('zip_plus_four');
    });

    it('Store Pickup option has pickup_time (complex choice with nested anyOf)', () => {
      const fulfillmentChoice = rows.find(
        (r) => r.type === 'choice' && r.path[0] === 'fulfillment',
      );
      const storePickup = fulfillmentChoice.options[1];
      expect(storePickup.title).toBe('Store Pickup');

      const pickupTime = storePickup.rows.find((r) => r.name === 'pickup_time');
      expect(pickupTime.hasChildren).toBe(true);

      // Nested anyOf choice inside pickup_time
      const pickupChoice = storePickup.rows.find(
        (r) => r.type === 'choice' && r.choiceType === 'anyOf',
      );
      expect(pickupChoice.level).toBe(2);
      expect(pickupChoice.options).toHaveLength(2);
      expect(pickupChoice.groupBrackets).toEqual([B(1, 0)]);

      // Scheduled Time option
      const scheduled = pickupChoice.options[0];
      expect(scheduled.title).toBe('Scheduled Time');
      const datetime = scheduled.rows.find((r) => r.name === 'datetime');
      expect(datetime.groupBrackets).toEqual([B(1, 0), B(2, 1)]);
    });
  });

  describe('discount section – complex choice (property + oneOf)', () => {
    it('discount is a property with nested oneOf choice', () => {
      const discount = findRow(rows, 'discount', 0);
      expect(discount.type).toBe('property');
      expect(discount.hasChildren).toBe(true);
      // discount has no type in schema, but oneOf options are objects
      expect(discount.containerType).toBe('object');

      const discountChoice = rows.find(
        (r) => r.type === 'choice' && r.path[0] === 'discount',
      );
      expect(discountChoice.level).toBe(1);
      expect(discountChoice.choiceType).toBe('oneOf');
      expect(discountChoice.options).toHaveLength(2);
      expect(discountChoice.groupBrackets).toEqual([]);

      // Percentage Discount option
      const pctOpt = discountChoice.options[0];
      expect(pctOpt.rows[0].groupBrackets).toEqual([B(1, 0)]);

      // Fixed Discount – amount is last in last option
      const fixedOpt = discountChoice.options[1];
      const amount = fixedOpt.rows.find((r) => r.name === 'amount');
      expect(amount.isLastInGroup).toBe(true);
    });
  });

  describe('metadata section – oneOf with if/then/else inside branch', () => {
    it('metadata has timestamp + source (complex choice)', () => {
      const timestamp = findByPath(rows, ['metadata', 'timestamp']);
      expect(timestamp.level).toBe(1);
      expect(timestamp.isLastInGroup).toBe(false);

      const source = findByPath(rows, ['metadata', 'source']);
      expect(source.type).toBe('property');
      expect(source.hasChildren).toBe(true);
      expect(source.isLastInGroup).toBe(true);

      const sourceChoice = rows.find(
        (r) =>
          r.type === 'choice' &&
          r.path.includes('source') &&
          r.path.includes('oneOf'),
      );
      expect(sourceChoice.level).toBe(2);
      expect(sourceChoice.options).toHaveLength(2);
    });

    it('Web Source option has if/then/else (conditional inside choice)', () => {
      const sourceChoice = rows.find(
        (r) =>
          r.type === 'choice' &&
          r.path.includes('source') &&
          r.path.includes('oneOf'),
      );
      const webSource = sourceChoice.options[0];
      expect(webSource.title).toBe('Web Source');

      const webConditional = webSource.rows.find(
        (r) => r.type === 'conditional',
      );
      expect(webConditional).toBeDefined();
      expect(webConditional.level).toBe(2);

      // Condition: device_type with double bracket (parent oneOf + this conditional)
      const condRow = webConditional.condition.rows[0];
      expect(condRow.name).toBe('device_type');
      expect(condRow.groupBrackets).toEqual([B(2, 0), B(2, 1)]);

      // Then: screen_width + touch_capable
      expect(webConditional.branches[0].rows).toHaveLength(2);
      expect(webConditional.branches[0].rows[0].name).toBe('screen_width');
      expect(webConditional.branches[0].rows[1].name).toBe('touch_capable');
      expect(webConditional.branches[0].rows[1].isLastInGroup).toBe(false); // then branch has else

      // Else: viewport_width + viewport_height
      expect(webConditional.branches[1].rows).toHaveLength(2);
    });

    it('App Source option has no conditional', () => {
      const sourceChoice = rows.find(
        (r) =>
          r.type === 'choice' &&
          r.path.includes('source') &&
          r.path.includes('oneOf'),
      );
      const appSource = sourceChoice.options[1];
      expect(appSource.rows.every((r) => r.type === 'property')).toBe(true);
      expect(appSource.rows).toHaveLength(3);

      const os = appSource.rows.find((r) => r.name === 'os');
      expect(os.isLastInGroup).toBe(true);
      expect(os.groupBrackets).toEqual([B(2, 0)]);
    });
  });

  describe('root-level if/then/else (payment.currency === USD)', () => {
    let rootConditional;

    beforeAll(() => {
      rootConditional = rows[rows.length - 1];
    });

    it('root conditional has correct structure', () => {
      expect(rootConditional.type).toBe('conditional');
      expect(rootConditional.level).toBe(0);
      expect(rootConditional.continuingLevels).toEqual([0]);
      expect(rootConditional.groupBrackets).toEqual([]);
    });

    it('condition rows: payment > currency', () => {
      const condRows = rootConditional.condition.rows;
      expect(condRows).toHaveLength(2);

      const payment = condRows[0];
      expect(payment.name).toBe('payment');
      expect(payment.isCondition).toBe(true);
      expect(payment.isLastInGroup).toBe(false); // branches always follow condition rows
      expect(payment.hasChildren).toBe(true);
      expect(payment.groupBrackets).toEqual([B(0, 0)]);

      const currency = condRows[1];
      expect(currency.name).toBe('currency');
      expect(currency.level).toBe(1);
      expect(currency.isCondition).toBe(true);
      expect(currency.isLastInGroup).toBe(true);
      expect(currency.groupBrackets).toEqual([B(0, 0)]);
    });

    it('Then branch: tax + nested conditional (CA jurisdiction)', () => {
      const thenBranch = rootConditional.branches[0];
      expect(thenBranch.title).toBe('Then');

      const tax = thenBranch.rows.find((r) => r.name === 'tax');
      expect(tax.level).toBe(0);
      expect(tax.hasChildren).toBe(true);
      expect(tax.containerType).toBe('object');
      expect(tax.isLastInGroup).toBe(false);
      expect(tax.groupBrackets).toEqual([B(0, 0)]);

      // Tax children: rate, amount, jurisdiction
      const rate = thenBranch.rows.find((r) => r.name === 'rate');
      expect(rate.level).toBe(1);
      expect(rate.groupBrackets).toEqual([B(0, 0)]);

      const jurisdiction = thenBranch.rows.find(
        (r) => r.name === 'jurisdiction',
      );
      expect(jurisdiction.isLastInGroup).toBe(true);

      // Nested conditional: if tax.jurisdiction === CA
      const nestedConditional = thenBranch.rows.find(
        (r) => r.type === 'conditional',
      );
      expect(nestedConditional).toBeDefined();
      expect(nestedConditional.level).toBe(0);
      expect(nestedConditional.groupBrackets).toEqual([B(0, 0)]);

      // Nested condition: tax > jurisdiction with double bracket
      const nestedCondRows = nestedConditional.condition.rows;
      expect(nestedCondRows[0].name).toBe('tax');
      expect(nestedCondRows[0].groupBrackets).toEqual([B(0, 0), B(0, 1)]);

      // Nested Then: recycling_fee
      const nestedThen = nestedConditional.branches[0];
      const recyclingFee = nestedThen.rows.find(
        (r) => r.name === 'recycling_fee',
      );
      expect(recyclingFee.hasChildren).toBe(true);
      expect(recyclingFee.groupBrackets).toEqual([B(0, 0), B(0, 1)]);

      // Nested Else: state_exemption_code
      const nestedElse = nestedConditional.branches[1];
      expect(nestedElse.rows[0].name).toBe('state_exemption_code');
      expect(nestedElse.rows[0].groupBrackets).toEqual([B(0, 0), B(0, 1)]);
    });

    it('Else branch: vat_number', () => {
      const elseBranch = rootConditional.branches[1];
      expect(elseBranch.title).toBe('Else');
      expect(elseBranch.rows).toHaveLength(1);
      expect(elseBranch.rows[0].name).toBe('vat_number');
      expect(elseBranch.rows[0].isLastInGroup).toBe(true);
      expect(elseBranch.rows[0].groupBrackets).toEqual([B(0, 0)]);
    });
  });

  describe('continuingLevels correctness across deep nesting', () => {
    it('level-3 properties inside customs_declaration have correct ancestor lines', () => {
      const fulfillmentChoice = rows.find(
        (r) => r.type === 'choice' && r.path[0] === 'fulfillment',
      );
      const homeDelivery = fulfillmentChoice.options[0];
      const addressConditional = homeDelivery.rows.find(
        (r) => r.type === 'conditional',
      );
      const thenBranch = addressConditional.branches[0];
      const declaredValue = thenBranch.rows.find(
        (r) => r.name === 'declared_value',
      );
      // Level 3 inside: fulfillment(0) > address(1) > customs(2) > declared_value(3)
      // fulfillment continues (not last root prop), address has more sibling rows,
      // and customs_declaration is no longer "last" because else follows the then branch
      expect(declaredValue.continuingLevels).toEqual([0, 1, 2]);
      expect(declaredValue.isLastInGroup).toBe(false);

      const hsCode = thenBranch.rows.find((r) => r.name === 'hs_code');
      expect(hsCode.isLastInGroup).toBe(true);
      expect(hsCode.continuingLevels).toEqual([0, 1, 2]);
    });

    it('nested conditional inside Then branch has accumulated brackets', () => {
      const rootConditional = rows[rows.length - 1];
      const thenBranch = rootConditional.branches[0];
      const nestedConditional = thenBranch.rows.find(
        (r) => r.type === 'conditional',
      );

      // Root conditional bracket + nested conditional bracket
      const nestedCondRow = nestedConditional.condition.rows[0];
      expect(nestedCondRow.groupBrackets).toEqual([B(0, 0), B(0, 1)]);

      // Inner condition's child also has double bracket
      const nestedJurisdiction = nestedConditional.condition.rows[1];
      expect(nestedJurisdiction.name).toBe('jurisdiction');
      expect(nestedJurisdiction.groupBrackets).toEqual([B(0, 0), B(0, 1)]);
    });
  });
});
