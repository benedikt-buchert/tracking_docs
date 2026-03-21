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

  // ── L23: findConditionalPoints only collects subschemas that have if AND (then OR else) ──
  describe('findConditionalPoints filtering (L23)', () => {
    it('does NOT generate a conditional group when schema has only if (no then/else)', () => {
      const schema = {
        type: 'object',
        properties: {
          status: { type: 'string', examples: ['active'] },
        },
        // `if` is present but no `then` or `else` — must NOT be treated as a conditional point
        if: { properties: { status: { const: 'active' } } },
      };
      const groups = schemaToExamples(schema);
      const conditionalGroup = groups.find((g) => g.property === 'conditional');
      // No conditional group should be emitted
      expect(conditionalGroup).toBeUndefined();
      // The schema has no choice points either, so we should get a plain default example
      expect(groups).toHaveLength(1);
      expect(groups[0].property).toBe('default');
    });

    it('generates a conditional group when schema has if + else but no then', () => {
      const schema = {
        type: 'object',
        properties: {
          country: { type: 'string', examples: ['CA'] },
        },
        if: { properties: { country: { const: 'US' } } },
        else: {
          properties: {
            postal_code: { type: 'string', examples: ['K1A 0B1'] },
          },
        },
      };
      const groups = schemaToExamples(schema);
      const conditionalGroup = groups.find((g) => g.property === 'conditional');
      expect(conditionalGroup).toBeDefined();
      // Only the else branch option should exist
      expect(conditionalGroup.options).toHaveLength(1);
      expect(conditionalGroup.options[0].title).toBe(
        'When condition is not met',
      );
    });
  });

  // ── L34/L37/L38: root-level choice schema (path.length === 0) ──
  describe('root-level oneOf choice (L34/L37/L38)', () => {
    it('generates examples for a root-level oneOf schema', () => {
      const schema = {
        title: 'Root Choice',
        oneOf: [
          {
            title: 'Option A',
            type: 'object',
            properties: { a: { type: 'string', examples: ['hello'] } },
          },
          {
            title: 'Option B',
            type: 'object',
            properties: { b: { type: 'number', examples: [42] } },
          },
        ],
      };
      const groups = schemaToExamples(schema);
      expect(groups).toHaveLength(1);
      expect(groups[0].property).toBe('root');
      expect(groups[0].options).toHaveLength(2);
      const optA = groups[0].options.find((o) => o.title === 'Option A');
      const optB = groups[0].options.find((o) => o.title === 'Option B');
      expect(optA).toBeDefined();
      expect(optB).toBeDefined();
      // Each option should produce a different example shape
      expect(optA.example).toHaveProperty('a');
      expect(optB.example).toHaveProperty('b');
    });

    it('generates examples for a root-level anyOf schema', () => {
      const schema = {
        anyOf: [
          { title: 'Numeric', type: 'number', examples: [1] },
          { title: 'Text', type: 'string', examples: ['text'] },
        ],
      };
      const groups = schemaToExamples(schema);
      expect(groups).toHaveLength(1);
      expect(groups[0].property).toBe('root');
      expect(groups[0].options).toHaveLength(2);
    });
  });

  // ── L57: default parameter for baseRequired ──
  describe('pruneSiblingConditionalProperties baseRequired default (L57)', () => {
    it('prunes inactive branch properties when baseRequired is omitted (default [])', () => {
      // Conditional where both branches only have "required" (no properties of their own)
      // The inactive branch requires a property that the base schema has;
      // since it is not in activeRequired or baseRequired, it should be pruned.
      const schema = {
        type: 'object',
        properties: {
          event: { type: 'string', examples: ['purchase'] },
          coupon_code: { type: 'string', examples: ['SAVE10'] },
        },
        required: ['event'],
        if: { properties: { event: { const: 'purchase' } } },
        then: {
          // active branch — no properties, only required adjustment
          required: ['event'],
        },
        else: {
          // inactive branch — requires coupon_code (not in activeRequired)
          required: ['coupon_code'],
        },
      };
      const groups = schemaToExamples(schema);
      const thenOption = groups
        .find((g) => g.property === 'conditional')
        ?.options.find((o) => o.title === 'When condition is met');
      expect(thenOption).toBeDefined();
      // coupon_code should have been pruned from the then example
      expect(thenOption.example).not.toHaveProperty('coupon_code');
    });
  });

  // ── L60: activeBranchSchema has no properties (branchesOnlyAdjustRequired) ──
  describe('pruneSiblingConditionalProperties — activeBranchSchema has no properties (L60)', () => {
    it('prunes inactive-branch-required property when active branch has no properties', () => {
      const schema = {
        type: 'object',
        properties: {
          event: { type: 'string', examples: ['click'] },
          extra: { type: 'string', examples: ['value'] },
        },
        required: ['event'],
        if: { properties: { event: { const: 'click' } } },
        // active branch: no properties key — only adjusts required
        then: { required: ['event'] },
        // inactive branch: no properties key — requires extra
        else: { required: ['extra'] },
      };
      const groups = schemaToExamples(schema);
      const thenGroup = groups
        .find((g) => g.property === 'conditional')
        ?.options.find((o) => o.title === 'When condition is met');
      expect(thenGroup).toBeDefined();
      // 'extra' is in the inactive (else) required list but not in active (then) required
      expect(thenGroup.example).not.toHaveProperty('extra');
    });

    it('does NOT prune when activeBranchSchema has properties (branchesOnlyAdjustRequired is false)', () => {
      const schema = {
        type: 'object',
        properties: {
          event: { type: 'string', examples: ['click'] },
        },
        required: ['event'],
        if: { properties: { event: { const: 'click' } } },
        // active branch: HAS properties — pruning should be skipped
        then: {
          properties: {
            click_target: { type: 'string', examples: ['button'] },
          },
          required: ['click_target'],
        },
        else: {
          properties: {
            page_url: { type: 'string', examples: ['https://example.com'] },
          },
          required: ['page_url'],
        },
      };
      const groups = schemaToExamples(schema);
      const thenGroup = groups
        .find((g) => g.property === 'conditional')
        ?.options.find((o) => o.title === 'When condition is met');
      expect(thenGroup).toBeDefined();
      expect(thenGroup.example).toHaveProperty('click_target', 'button');
    });
  });

  // ── L70: activeBranchSchema?.required fallback to [] ──
  describe('pruneSiblingConditionalProperties — activeBranchSchema has no required (L70)', () => {
    it('prunes inactive-required property even when active branch has no required array', () => {
      const schema = {
        type: 'object',
        properties: {
          event: { type: 'string', examples: ['view'] },
          promo: { type: 'string', examples: ['PROMO1'] },
        },
        required: ['event'],
        if: { properties: { event: { const: 'view' } } },
        // active branch: no properties, no required
        then: {},
        // inactive branch: no properties, requires promo
        else: { required: ['promo'] },
      };
      const groups = schemaToExamples(schema);
      const thenGroup = groups
        .find((g) => g.property === 'conditional')
        ?.options.find((o) => o.title === 'When condition is met');
      expect(thenGroup).toBeDefined();
      // promo is required by else but NOT by then — should be pruned
      expect(thenGroup.example).not.toHaveProperty('promo');
    });
  });

  // ── L74: required intersection — property protected by baseRequired ──
  describe('pruneSiblingConditionalProperties — required intersection (L74)', () => {
    it('does not prune a property that is protected by baseRequired even if inactive branch requires it', () => {
      const schema = {
        type: 'object',
        properties: {
          event: { type: 'string', examples: ['buy'] },
          user_id: { type: 'string', examples: ['u123'] },
        },
        // user_id is in the BASE required — should never be pruned
        required: ['event', 'user_id'],
        if: { properties: { event: { const: 'buy' } } },
        then: {},
        else: { required: ['user_id'] },
      };
      const groups = schemaToExamples(schema);
      const thenGroup = groups
        .find((g) => g.property === 'conditional')
        ?.options.find((o) => o.title === 'When condition is met');
      expect(thenGroup).toBeDefined();
      // user_id is protected by baseRequired — must NOT be pruned
      expect(thenGroup.example).toHaveProperty('user_id');
    });

    it('does not prune a property that is in both active and inactive required', () => {
      const schema = {
        type: 'object',
        properties: {
          event: { type: 'string', examples: ['buy'] },
          shared: { type: 'string', examples: ['shared_value'] },
        },
        required: ['event'],
        if: { properties: { event: { const: 'buy' } } },
        // shared is required by BOTH branches — should NOT be pruned
        then: { required: ['shared'] },
        else: { required: ['shared'] },
      };
      const groups = schemaToExamples(schema);
      const thenGroup = groups
        .find((g) => g.property === 'conditional')
        ?.options.find((o) => o.title === 'When condition is met');
      expect(thenGroup).toBeDefined();
      expect(thenGroup.example).toHaveProperty('shared');
    });
  });

  // ── L79-81: pruneSiblingConditionalProperties filter chain — required array on mergedSchema ──
  describe('pruneSiblingConditionalProperties — mergedSchema.required filter (L79-81)', () => {
    it('removes the pruned property name from mergedSchema.required', () => {
      // After pruning, mergedSchema.required should no longer contain the pruned name.
      // scroll_depth must NOT be in baseRequired so it can be pruned.
      const schema = {
        type: 'object',
        properties: {
          event: { type: 'string', examples: ['scroll'] },
          scroll_depth: { type: 'number', examples: [50] },
        },
        // Only event is in base required; scroll_depth is NOT protected by baseRequired
        required: ['event'],
        if: { properties: { event: { const: 'scroll' } } },
        then: { required: ['event'] },
        else: { required: ['scroll_depth'] },
      };
      const groups = schemaToExamples(schema);
      const thenGroup = groups
        .find((g) => g.property === 'conditional')
        ?.options.find((o) => o.title === 'When condition is met');
      expect(thenGroup).toBeDefined();
      // scroll_depth was required by else but not by then, not in base — pruned
      expect(thenGroup.example).not.toHaveProperty('scroll_depth');
    });

    it('does not throw when mergedSchema.required is not an array', () => {
      // required is absent on the merged schema — the filter path is skipped
      const schema = {
        type: 'object',
        properties: {
          event: { type: 'string', examples: ['tap'] },
          detail: { type: 'string', examples: ['some_detail'] },
        },
        // NO top-level required
        if: { properties: { event: { const: 'tap' } } },
        then: {},
        else: { required: ['detail'] },
      };
      const groups = schemaToExamples(schema);
      const thenGroup = groups
        .find((g) => g.property === 'conditional')
        ?.options.find((o) => o.title === 'When condition is met');
      expect(thenGroup).toBeDefined();
      expect(thenGroup.example).not.toHaveProperty('detail');
    });
  });

  // ── L93/L96: generateConditionalExample — path.length === 0 branch, required fallback ──
  describe('generateConditionalExample path.length === 0 (L93/L96)', () => {
    it('handles a root-level conditional where baseSchema has no required array', () => {
      const schema = {
        type: 'object',
        properties: {
          mode: { type: 'string', examples: ['fast'] },
        },
        // no required at root
        if: { properties: { mode: { const: 'fast' } } },
        then: { properties: { turbo: { type: 'boolean', examples: [true] } } },
        else: {
          properties: { slow_mode: { type: 'boolean', examples: [false] } },
        },
      };
      const groups = schemaToExamples(schema);
      const conditional = groups.find((g) => g.property === 'conditional');
      expect(conditional).toBeDefined();
      const thenOpt = conditional.options.find(
        (o) => o.title === 'When condition is met',
      );
      expect(thenOpt.example).toHaveProperty('turbo', true);
    });

    it('handles a root-level conditional where schemaVariant has required array', () => {
      const schema = {
        type: 'object',
        properties: {
          mode: { type: 'string', examples: ['fast'] },
        },
        required: ['mode'],
        if: { properties: { mode: { const: 'fast' } } },
        then: { properties: { turbo: { type: 'boolean', examples: [true] } } },
      };
      const groups = schemaToExamples(schema);
      const conditional = groups.find((g) => g.property === 'conditional');
      expect(conditional).toBeDefined();
      expect(conditional.options[0].example).toHaveProperty('mode');
    });
  });

  // ── L100/L122: branchSchema falsy — fallback path ──
  describe('generateConditionalExample — missing branch schema (L100/L122)', () => {
    it('returns base example when then branch is undefined at root level', () => {
      // Manually trigger: else exists but then does not — when we call branch='then' it is falsy
      // We achieve this via schemaToExamples by having only else
      const schema = {
        type: 'object',
        properties: {
          flag: { type: 'string', examples: ['off'] },
        },
        if: { properties: { flag: { const: 'on' } } },
        else: {
          properties: { detail: { type: 'string', examples: ['fallback'] } },
        },
      };
      const groups = schemaToExamples(schema);
      const conditional = groups.find((g) => g.property === 'conditional');
      expect(conditional).toBeDefined();
      expect(conditional.options).toHaveLength(1);
      expect(conditional.options[0].title).toBe('When condition is not met');
      expect(conditional.options[0].example).toHaveProperty('detail');
    });
  });

  // ── L118/L122: nested conditional — target.required fallback (path.length > 0) ──
  describe('generateConditionalExample nested — target.required fallback (L118/L122)', () => {
    it('handles nested conditional where target has no required array', () => {
      const schema = {
        type: 'object',
        properties: {
          shipping: {
            type: 'object',
            properties: {
              method: { type: 'string', examples: ['express'] },
            },
            // no required on the nested object
            if: { properties: { method: { const: 'express' } } },
            then: {
              properties: {
                priority_level: { type: 'string', examples: ['high'] },
              },
            },
            else: {
              properties: {
                estimated_days: { type: 'number', examples: [5] },
              },
            },
          },
        },
      };
      const groups = schemaToExamples(schema);
      const conditional = groups.find((g) => g.property === 'conditional');
      expect(conditional).toBeDefined();
      const thenOpt = conditional.options.find(
        (o) => o.title === 'When condition is met',
      );
      expect(thenOpt.example.shipping).toHaveProperty('priority_level', 'high');
    });

    it('handles nested conditional where target has a required array', () => {
      const schema = {
        type: 'object',
        properties: {
          shipping: {
            type: 'object',
            properties: {
              method: { type: 'string', examples: ['express'] },
            },
            required: ['method'],
            if: { properties: { method: { const: 'express' } } },
            then: {
              properties: {
                priority_level: { type: 'string', examples: ['high'] },
              },
            },
          },
        },
      };
      const groups = schemaToExamples(schema);
      const conditional = groups.find((g) => g.property === 'conditional');
      expect(conditional).toBeDefined();
      const thenOpt = conditional.options.find(
        (o) => o.title === 'When condition is met',
      );
      expect(thenOpt.example.shipping).toHaveProperty('method');
    });
  });

  // ── L129: ArrowFunction — Object.keys(target).forEach deletion in nested path ──
  describe('generateConditionalExample nested — target key deletion (L129)', () => {
    it('merges branch schema into target for nested conditional with branchSchema present', () => {
      const schema = {
        type: 'object',
        properties: {
          delivery: {
            type: 'object',
            properties: {
              speed: { type: 'string', examples: ['overnight'] },
              cost: { type: 'number', examples: [9.99] },
            },
            if: { properties: { speed: { const: 'overnight' } } },
            then: {
              properties: {
                surcharge: { type: 'number', examples: [5.0] },
              },
            },
          },
        },
      };
      const groups = schemaToExamples(schema);
      const conditional = groups.find((g) => g.property === 'conditional');
      const thenOpt = conditional?.options.find(
        (o) => o.title === 'When condition is met',
      );
      expect(thenOpt).toBeDefined();
      // The merged branch should include surcharge
      expect(thenOpt.example.delivery).toHaveProperty('surcharge', 5.0);
      // The original delivery properties should still be present
      expect(thenOpt.example.delivery).toHaveProperty('speed');
    });
  });

  // ── L143/L144/L145/L147/L149/L158/L161/L171: schemaToExamples simple branch (no choice/conditional) ──
  describe('schemaToExamples — simple schema (no choice/conditional points) (L143-L171)', () => {
    it('returns a default example group for a simple object schema', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string', examples: ['Alice'] },
        },
      };
      const groups = schemaToExamples(schema);
      expect(groups).toHaveLength(1);
      expect(groups[0].property).toBe('default');
      expect(groups[0].options).toHaveLength(1);
      expect(groups[0].options[0].title).toBe('Example');
      expect(groups[0].options[0].example).toHaveProperty('name', 'Alice');
    });

    it('returns empty array when buildExampleFromSchema returns undefined', () => {
      // A schema that produces no example (empty type array or similar)
      const schema = { not: {} };
      const groups = schemaToExamples(schema);
      // buildExampleFromSchema returns undefined for `not` schemas
      expect(groups).toEqual([]);
    });

    it('returns empty array when buildExampleFromSchema returns an empty object (L144/L145)', () => {
      // An object schema with no properties produces {} — should be filtered out
      const schema = { type: 'object' };
      const groups = schemaToExamples(schema);
      expect(groups).toEqual([]);
    });

    it('includes null example (L144 — null is not filtered out)', () => {
      // A schema with a top-level examples array that resolves to null
      // null !== undefined, typeof null === 'object', null === null → shouldIncludeObjectExample = true
      const schema = {
        type: 'object',
        examples: [null],
      };
      const groups = schemaToExamples(schema);
      // buildExampleFromSchema picks the first entry from examples: [null] → null
      // null passes the shouldIncludeObjectExample check (example === null branch)
      expect(groups).toHaveLength(1);
      expect(groups[0].options[0].example).toBeNull();
    });

    it('includes a primitive (string) example without empty-object filtering (L143/L147)', () => {
      const schema = { type: 'string', examples: ['hello'] };
      const groups = schemaToExamples(schema);
      expect(groups).toHaveLength(1);
      expect(groups[0].options[0].example).toBe('hello');
    });

    it('includes a non-empty object example (L145/L149)', () => {
      const schema = {
        type: 'object',
        properties: {
          id: { type: 'integer', examples: [1] },
        },
      };
      const groups = schemaToExamples(schema);
      expect(groups).toHaveLength(1);
      expect(groups[0].options[0].example).toHaveProperty('id', 1);
    });
  });

  // ── L158: path.length > 0 gives last path segment as propertyName ──
  describe('choiceExamples — propertyName from path (L158)', () => {
    it('uses "root" as property name when path is empty (root-level oneOf)', () => {
      const schema = {
        oneOf: [
          { title: 'A', type: 'string', examples: ['a'] },
          { title: 'B', type: 'string', examples: ['b'] },
        ],
      };
      const groups = schemaToExamples(schema);
      expect(groups[0].property).toBe('root');
    });

    it('uses last path segment as property name for nested oneOf', () => {
      const schema = {
        type: 'object',
        properties: {
          user_id: {
            oneOf: [
              { title: 'String ID', type: 'string', examples: ['u1'] },
              { title: 'Numeric ID', type: 'integer', examples: [1] },
            ],
          },
        },
      };
      const groups = schemaToExamples(schema);
      // path = ['properties', 'user_id'] — last segment is 'user_id'
      const group = groups.find((g) => g.property === 'user_id');
      expect(group).toBeDefined();
      expect(group.options).toHaveLength(2);
    });
  });

  // ── L161: NoCoverage — options with no title fall back to 'Option' ──
  describe('choiceExamples — option title fallback (L161)', () => {
    it('uses "Option" as title when option has no title', () => {
      const schema = {
        type: 'object',
        properties: {
          value: {
            oneOf: [
              { type: 'string', examples: ['hello'] },
              { type: 'number', examples: [42] },
            ],
          },
        },
      };
      const groups = schemaToExamples(schema);
      const group = groups.find((g) => g.property === 'value');
      expect(group).toBeDefined();
      group.options.forEach((opt) => {
        expect(opt.title).toBe('Option');
      });
    });
  });

  // ── L171: conditionalExamples property is always 'conditional' ──
  describe('conditionalExamples — property name (L171)', () => {
    it('always uses "conditional" as property name for conditional groups', () => {
      const schema = {
        type: 'object',
        properties: {
          flag: { type: 'string', examples: ['yes'] },
        },
        if: { properties: { flag: { const: 'yes' } } },
        then: {
          properties: { bonus: { type: 'string', examples: ['gift'] } },
        },
        else: {
          properties: { penalty: { type: 'string', examples: ['fee'] } },
        },
      };
      const groups = schemaToExamples(schema);
      const conditionalGroup = groups.find((g) => g.property === 'conditional');
      expect(conditionalGroup).toBeDefined();
      expect(conditionalGroup.property).toBe('conditional');
    });
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
