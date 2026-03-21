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

  // ── Mutant killers: targeted tests for surviving Stryker mutants ──

  describe('L34: root-level choice path.length === 0 must not be mutated to false', () => {
    it('root-level oneOf deletes oneOf key and merges — result differs from nested path handling', () => {
      const schema = {
        type: 'object',
        properties: { base: { type: 'string', examples: ['val'] } },
        oneOf: [
          {
            title: 'WithExtra',
            properties: { extra: { type: 'string', examples: ['e'] } },
          },
        ],
      };
      const groups = schemaToExamples(schema);
      expect(groups).toHaveLength(1);
      expect(groups[0].property).toBe('root');
      // The merged example must contain BOTH base and extra
      expect(groups[0].options[0].example).toHaveProperty('base', 'val');
      expect(groups[0].options[0].example).toHaveProperty('extra', 'e');
    });
  });

  describe('L60: branchesOnlyAdjustRequired — && vs || and optional chaining', () => {
    it('does NOT prune when only inactiveBranchSchema has properties (one has, one does not)', () => {
      // activeBranch has NO properties, inactiveBranch HAS properties
      // branchesOnlyAdjustRequired = !undefined && !{...} = true && false = false
      // With && -> false => skip pruning (correct)
      // With || -> true || false = true => would incorrectly prune
      const schema = {
        type: 'object',
        properties: {
          event: { type: 'string', examples: ['test'] },
          removable: { type: 'string', examples: ['keep_me'] },
        },
        required: ['event'],
        if: { properties: { event: { const: 'test' } } },
        then: { required: ['event'] },
        else: {
          properties: {
            other: { type: 'string', examples: ['other_val'] },
          },
          required: ['removable'],
        },
      };
      const groups = schemaToExamples(schema);
      const thenOpt = groups
        .find((g) => g.property === 'conditional')
        ?.options.find((o) => o.title === 'When condition is met');
      expect(thenOpt).toBeDefined();
      // Since else has properties, branchesOnlyAdjustRequired is false,
      // so pruning is skipped and removable should remain
      expect(thenOpt.example).toHaveProperty('removable', 'keep_me');
    });

    it('does NOT prune when only activeBranchSchema has properties', () => {
      const schema = {
        type: 'object',
        properties: {
          event: { type: 'string', examples: ['test'] },
          removable: { type: 'string', examples: ['keep_me'] },
        },
        required: ['event'],
        if: { properties: { event: { const: 'test' } } },
        then: {
          properties: {
            added: { type: 'string', examples: ['new_val'] },
          },
          required: ['event'],
        },
        else: { required: ['removable'] },
      };
      const groups = schemaToExamples(schema);
      const thenOpt = groups
        .find((g) => g.property === 'conditional')
        ?.options.find((o) => o.title === 'When condition is met');
      expect(thenOpt).toBeDefined();
      // Since then has properties, branchesOnlyAdjustRequired is false,
      // so pruning is skipped and removable should remain
      expect(thenOpt.example).toHaveProperty('removable', 'keep_me');
    });
  });

  describe('L79-83: mergedSchema.required array filtering', () => {
    it('actually removes pruned property from mergedSchema.required array', () => {
      // Need a scenario where:
      // 1. mergedSchema has a required array containing the pruned property name
      // 2. After pruning, that name should be gone from required
      // We test this indirectly through the final example output
      const schema = {
        type: 'object',
        properties: {
          event: { type: 'string', examples: ['action'] },
          temp_field: { type: 'string', examples: ['temp'] },
          keep_field: { type: 'string', examples: ['keep'] },
        },
        required: ['event', 'keep_field'],
        if: { properties: { event: { const: 'action' } } },
        then: { required: ['event', 'keep_field'] },
        else: { required: ['temp_field'] },
      };
      const groups = schemaToExamples(schema);
      const thenOpt = groups
        .find((g) => g.property === 'conditional')
        ?.options.find((o) => o.title === 'When condition is met');
      expect(thenOpt).toBeDefined();
      // temp_field should be pruned (not in active required, not in base required)
      expect(thenOpt.example).not.toHaveProperty('temp_field');
      // keep_field is in base required — must stay
      expect(thenOpt.example).toHaveProperty('keep_field', 'keep');
      // event is in both — must stay
      expect(thenOpt.example).toHaveProperty('event', 'action');
    });

    it('filter correctly excludes only the matching name from required (L81 !== vs ===)', () => {
      // If the EqualityOperator is flipped (=== instead of !==), the filter would
      // KEEP only the pruned name instead of removing it
      const schema = {
        type: 'object',
        properties: {
          event: { type: 'string', examples: ['go'] },
          alpha: { type: 'string', examples: ['a'] },
          beta: { type: 'string', examples: ['b'] },
        },
        required: ['event', 'alpha'],
        if: { properties: { event: { const: 'go' } } },
        then: { required: ['event'] },
        else: { required: ['alpha', 'beta'] },
      };
      const groups = schemaToExamples(schema);
      const thenOpt = groups
        .find((g) => g.property === 'conditional')
        ?.options.find((o) => o.title === 'When condition is met');
      expect(thenOpt).toBeDefined();
      // alpha is in base required — protected, must stay
      expect(thenOpt.example).toHaveProperty('alpha', 'a');
      // beta is NOT in active or base required — must be pruned
      expect(thenOpt.example).not.toHaveProperty('beta');
      // event is in active required — must stay
      expect(thenOpt.example).toHaveProperty('event', 'go');
    });
  });

  describe('L93: root conditional path.length === 0 block must execute', () => {
    it('root conditional correctly deletes if/then/else and merges branch at root level', () => {
      // If L93 block is emptied (BlockStatement -> {}), the root conditional
      // would fall through to the nested path handling which would fail
      const schema = {
        type: 'object',
        properties: {
          color: { type: 'string', examples: ['red'] },
        },
        required: ['color'],
        if: { properties: { color: { const: 'red' } } },
        then: {
          properties: { shade: { type: 'string', examples: ['crimson'] } },
        },
        else: {
          properties: { shade: { type: 'string', examples: ['navy'] } },
        },
      };
      const groups = schemaToExamples(schema);
      const conditional = groups.find((g) => g.property === 'conditional');
      expect(conditional).toBeDefined();

      const thenOpt = conditional.options.find(
        (o) => o.title === 'When condition is met',
      );
      expect(thenOpt).toBeDefined();
      expect(thenOpt.example).toHaveProperty('color', 'red');
      expect(thenOpt.example).toHaveProperty('shade', 'crimson');

      const elseOpt = conditional.options.find(
        (o) => o.title === 'When condition is not met',
      );
      expect(elseOpt).toBeDefined();
      expect(elseOpt.example).toHaveProperty('color', 'red');
      expect(elseOpt.example).toHaveProperty('shade', 'navy');
    });
  });

  describe('L96: baseRequired fallback to [] when schema has no required (root conditional)', () => {
    it('uses empty array as baseRequired fallback, allowing pruning of inactive-only properties', () => {
      // If [] is mutated to ["Stryker was here"], then "Stryker was here" would
      // be in protectedRequired and if any inactive required matches it wouldn't prune
      // With the correct [] fallback, nothing is protected by baseRequired
      const schema = {
        type: 'object',
        properties: {
          event: { type: 'string', examples: ['click'] },
          removable: { type: 'string', examples: ['bye'] },
        },
        // NO required array on schema root
        if: { properties: { event: { const: 'click' } } },
        then: {},
        else: { required: ['removable'] },
      };
      const groups = schemaToExamples(schema);
      const thenOpt = groups
        .find((g) => g.property === 'conditional')
        ?.options.find((o) => o.title === 'When condition is met');
      expect(thenOpt).toBeDefined();
      // removable should be pruned since it's only in else required and nothing protects it
      expect(thenOpt.example).not.toHaveProperty('removable');
    });
  });

  describe('L100: branchSchema truthiness check at root level', () => {
    it('when branch is then and schema has then, produces merged example (not bare schema)', () => {
      // If L100 is mutated to `true`, even a falsy branchSchema would enter the merge path
      // and crash. We verify the correct path by checking the result is properly merged.
      const schema = {
        type: 'object',
        properties: {
          status: { type: 'string', examples: ['active'] },
        },
        if: { properties: { status: { const: 'active' } } },
        then: {
          properties: { detail: { type: 'string', examples: ['info'] } },
        },
      };
      const groups = schemaToExamples(schema);
      const conditional = groups.find((g) => g.property === 'conditional');
      expect(conditional).toBeDefined();
      // Only then branch, no else
      expect(conditional.options).toHaveLength(1);
      expect(conditional.options[0].example).toHaveProperty('detail', 'info');
      expect(conditional.options[0].example).toHaveProperty('status', 'active');
    });
  });

  describe('L118: nested conditional target.required fallback and branchSchema check', () => {
    it('nested conditional with target.required present uses it as baseRequired', () => {
      // If target.required || [] is mutated to target.required && [],
      // when target.required exists, && would return [] instead of the actual array
      const schema = {
        type: 'object',
        properties: {
          wrapper: {
            type: 'object',
            properties: {
              mode: { type: 'string', examples: ['fast'] },
              protected_prop: { type: 'string', examples: ['safe'] },
              removable_prop: { type: 'string', examples: ['gone'] },
            },
            required: ['mode', 'protected_prop'],
            if: { properties: { mode: { const: 'fast' } } },
            then: { required: ['mode'] },
            else: { required: ['protected_prop', 'removable_prop'] },
          },
        },
      };
      const groups = schemaToExamples(schema);
      const thenOpt = groups
        .find((g) => g.property === 'conditional')
        ?.options.find((o) => o.title === 'When condition is met');
      expect(thenOpt).toBeDefined();
      // protected_prop is in baseRequired (['mode', 'protected_prop']) — must NOT be pruned
      expect(thenOpt.example.wrapper).toHaveProperty('protected_prop', 'safe');
      // removable_prop is NOT in active required or base required — must be pruned
      expect(thenOpt.example.wrapper).not.toHaveProperty('removable_prop');
    });

    it('nested conditional without branchSchema skips merge and returns base example', () => {
      // If L122 is mutated to `true`, it would try to merge undefined branchSchema
      const schema = {
        type: 'object',
        properties: {
          wrapper: {
            type: 'object',
            properties: {
              mode: { type: 'string', examples: ['slow'] },
            },
            if: { properties: { mode: { const: 'slow' } } },
            else: {
              properties: {
                speed: { type: 'string', examples: ['fast'] },
              },
            },
          },
        },
      };
      const groups = schemaToExamples(schema);
      const conditional = groups.find((g) => g.property === 'conditional');
      expect(conditional).toBeDefined();
      // Only else branch exists, so only one option
      expect(conditional.options).toHaveLength(1);
      expect(conditional.options[0].title).toBe('When condition is not met');
    });
  });

  describe('L129: Object.keys(target).forEach deletion must execute', () => {
    it('replaces all target keys with merged result in nested conditional', () => {
      // If the arrow function is mutated to () => undefined, target keys won't be deleted
      // and the result would have stale properties from the original target
      const schema = {
        type: 'object',
        properties: {
          nested: {
            type: 'object',
            properties: {
              action: { type: 'string', examples: ['run'] },
            },
            required: ['action'],
            if: { properties: { action: { const: 'run' } } },
            then: {
              properties: {
                speed: { type: 'number', examples: [100] },
              },
            },
            else: {
              properties: {
                reason: { type: 'string', examples: ['tired'] },
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
      expect(thenOpt.example.nested).toHaveProperty('action', 'run');
      expect(thenOpt.example.nested).toHaveProperty('speed', 100);
      // The nested object should be the merged result
      expect(typeof thenOpt.example.nested).toBe('object');
      expect(thenOpt.example.nested).not.toBeNull();
    });
  });

  describe('L143-145: shouldIncludeObjectExample edge cases', () => {
    it('excludes empty object example (Object.keys(example).length > 0 must be strict)', () => {
      // If > 0 is mutated to >= 0, empty objects would pass through
      const schema = { type: 'object' };
      const groups = schemaToExamples(schema);
      // Empty object should be excluded
      expect(groups).toEqual([]);
      expect(groups).toHaveLength(0);
    });

    it('includes object with exactly one property (boundary for > 0)', () => {
      const schema = {
        type: 'object',
        properties: {
          solo: { type: 'string', examples: ['only'] },
        },
      };
      const groups = schemaToExamples(schema);
      expect(groups).toHaveLength(1);
      expect(groups[0].options[0].example).toEqual({ solo: 'only' });
    });

    it('typeof check distinguishes object from string correctly (L143)', () => {
      // If "object" is mutated to "", typeof example !== "" would be true for
      // everything, and the short-circuit would skip the Object.keys check
      const schema = { type: 'string', examples: ['test_string'] };
      const groups = schemaToExamples(schema);
      expect(groups).toHaveLength(1);
      expect(groups[0].options[0].example).toBe('test_string');
    });

    it('number example is included (typeof !== object is true)', () => {
      const schema = { type: 'number', examples: [0] };
      const groups = schemaToExamples(schema);
      expect(groups).toHaveLength(1);
      expect(groups[0].options[0].example).toBe(0);
    });

    it('boolean false example is included (typeof !== object is true)', () => {
      const schema = { type: 'boolean', examples: [false] };
      const groups = schemaToExamples(schema);
      expect(groups).toHaveLength(1);
      expect(groups[0].options[0].example).toBe(false);
    });

    it('shouldIncludeObjectExample returns true when condition is met, wraps in expected structure (L147)', () => {
      const schema = {
        type: 'object',
        properties: {
          x: { type: 'integer', examples: [42] },
        },
      };
      const groups = schemaToExamples(schema);
      // Must be wrapped in exactly this structure
      expect(groups).toEqual([
        {
          property: 'default',
          options: [{ title: 'Example', example: { x: 42 } }],
        },
      ]);
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
