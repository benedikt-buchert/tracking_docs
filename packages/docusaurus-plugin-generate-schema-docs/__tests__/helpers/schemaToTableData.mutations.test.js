/**
 * Targeted mutation-killing tests for schemaToTableData.js.
 * Each describe block targets specific uncovered branches identified by
 * surviving mutations.
 */
import { schemaToTableData } from '../../helpers/schemaToTableData';

// ---------------------------------------------------------------------------
// materializeConditionalBranchSchema (L13-35)
// ---------------------------------------------------------------------------
describe('materializeConditionalBranchSchema early-return conditions', () => {
  // L15: branchSchema is falsy — the function should just return branchSchema (falsy)
  // This is exercised indirectly: if subSchema.then is undefined, buildConditionalRow
  // skips it. We test nullish branch indirectly via a schema where else is undefined.
  it('skips else branch entirely when there is no else', () => {
    const schema = {
      type: 'object',
      properties: { status: { type: 'string' } },
      if: { properties: { status: { const: 'active' } } },
      then: { properties: { active_since: { type: 'string' } } },
    };
    const rows = schemaToTableData(schema);
    const conditional = rows.find((r) => r.type === 'conditional');
    expect(conditional).toBeDefined();
    expect(conditional.branches).toHaveLength(1);
    expect(conditional.branches[0].title).toBe('Then');
  });

  // L16: branchSchema.properties is set → return early (don't materialise)
  it('does NOT add parent properties when branch already has .properties', () => {
    const schema = {
      type: 'object',
      properties: {
        foo: { type: 'string' },
        bar: { type: 'number' },
      },
      if: { properties: { foo: { const: 'x' } } },
      then: {
        // branch has its own properties — must NOT be merged with parent props
        properties: { bar: { type: 'number' } },
        required: ['bar'],
      },
    };
    const rows = schemaToTableData(schema);
    const conditional = rows.find((r) => r.type === 'conditional');
    const thenBranch = conditional.branches.find((b) => b.title === 'Then');
    // Only 'bar' (from branch.properties), not duplicated from parent
    expect(thenBranch.rows).toHaveLength(1);
    expect(thenBranch.rows[0].name).toBe('bar');
  });

  // L17: branchSchema.oneOf set → return early
  it('returns branch as-is when branch has .oneOf', () => {
    const schema = {
      type: 'object',
      properties: { x: { type: 'string' } },
      if: { properties: { x: { const: 'val' } } },
      then: {
        oneOf: [{ title: 'A', properties: { a_prop: { type: 'string' } } }],
      },
    };
    const rows = schemaToTableData(schema);
    const conditional = rows.find((r) => r.type === 'conditional');
    expect(conditional).toBeDefined();
    const thenBranch = conditional.branches.find((b) => b.title === 'Then');
    expect(thenBranch).toBeDefined();
    // Branch rendered via its own oneOf, not materialised from parent
    const choiceRow = thenBranch.rows.find((r) => r.type === 'choice');
    expect(choiceRow).toBeDefined();
  });

  // L18: branchSchema.anyOf set → return early
  it('returns branch as-is when branch has .anyOf', () => {
    const schema = {
      type: 'object',
      properties: { x: { type: 'string' } },
      if: { properties: { x: { const: 'val' } } },
      then: {
        anyOf: [{ title: 'B', properties: { b_prop: { type: 'string' } } }],
      },
    };
    const rows = schemaToTableData(schema);
    const conditional = rows.find((r) => r.type === 'conditional');
    expect(conditional).toBeDefined();
    const thenBranch = conditional.branches.find((b) => b.title === 'Then');
    expect(thenBranch).toBeDefined();
    const choiceRow = thenBranch.rows.find((r) => r.type === 'choice');
    expect(choiceRow).toBeDefined();
  });

  // L19: branchSchema.if set → return early
  it('returns branch as-is when branch itself has .if', () => {
    const schema = {
      type: 'object',
      properties: { x: { type: 'string' }, y: { type: 'string' } },
      if: { properties: { x: { const: 'val' } } },
      then: {
        // nested if inside a branch — must not be materialised
        if: { properties: { y: { const: 'z' } } },
        then: { properties: { z_prop: { type: 'number' } } },
      },
    };
    const rows = schemaToTableData(schema);
    const conditional = rows.find((r) => r.type === 'conditional');
    expect(conditional).toBeDefined();
    const thenBranch = conditional.branches.find((b) => b.title === 'Then');
    expect(thenBranch).toBeDefined();
    // The branch's own if/then renders as a nested conditional row
    const nestedConditional = thenBranch.rows.find(
      (r) => r.type === 'conditional',
    );
    expect(nestedConditional).toBeDefined();
  });

  // L20: branchSchema.required is not an array → return early
  it('returns branch as-is when branch.required is not an array', () => {
    const schema = {
      type: 'object',
      properties: { foo: { type: 'string' } },
      if: { properties: { foo: { const: 'x' } } },
      then: {
        // required is a string, not an array → should NOT materialise
        required: 'foo',
        description: 'a non-array required branch',
      },
    };
    const rows = schemaToTableData(schema);
    const conditional = rows.find((r) => r.type === 'conditional');
    expect(conditional).toBeDefined();
    // The then branch should render as-is (no property rows since
    // no .properties / .type defined)
    const thenBranch = conditional.branches.find((b) => b.title === 'Then');
    expect(thenBranch).toBeDefined();
    // No property rows — branch passed through unchanged
    expect(thenBranch.rows).toHaveLength(0);
  });

  // L21: OptionalChaining — parentSchema?.properties is falsy → return early
  it('returns branch as-is when parentSchema has no .properties', () => {
    // Calling materializeConditionalBranchSchema with a parent that has no
    // properties. We test this via a schema where the conditional container
    // itself has no properties keyword.
    const schema = {
      // No .properties on this object, just if/then
      type: 'object',
      if: { properties: { kind: { const: 'special' } } },
      then: { required: ['kind'] },
    };
    const rows = schemaToTableData(schema);
    const conditional = rows.find((r) => r.type === 'conditional');
    expect(conditional).toBeDefined();
    // then.required=['kind'] but parent has no .properties → branch as-is → 0 rows
    const thenBranch = conditional.branches.find((b) => b.title === 'Then');
    expect(thenBranch).toBeDefined();
    expect(thenBranch.rows).toHaveLength(0);
  });

  // L27: branchSchema.required.filter — required points to names NOT in parent
  it('returns branchSchema unchanged when required names not present in parent properties', () => {
    const schema = {
      type: 'object',
      properties: {
        foo: { type: 'string' },
      },
      if: { properties: { foo: { const: 'x' } } },
      then: {
        // 'nonexistent' is not in parent.properties → branchProperties is empty
        required: ['nonexistent'],
      },
    };
    const rows = schemaToTableData(schema);
    const conditional = rows.find((r) => r.type === 'conditional');
    expect(conditional).toBeDefined();
    const thenBranch = conditional.branches.find((b) => b.title === 'Then');
    // Empty branchProperties → returns branchSchema unchanged (no .properties) → 0 rows
    expect(thenBranch.rows).toHaveLength(0);
  });

  // L32: ConditionalExpression — empty branchProperties returns unchanged schema
  // Already covered above by "required names not present" — extra assertion:
  it('materialises branch properties correctly when required matches parent', () => {
    const schema = {
      type: 'object',
      properties: {
        foo: { type: 'string' },
        bar: { type: 'number' },
      },
      if: { properties: { foo: { const: 'x' } } },
      then: { required: ['bar'] },
    };
    const rows = schemaToTableData(schema);
    const conditional = rows.find((r) => r.type === 'conditional');
    const thenBranch = conditional.branches.find((b) => b.title === 'Then');
    expect(thenBranch.rows).toHaveLength(1);
    expect(thenBranch.rows[0].name).toBe('bar');
    expect(thenBranch.rows[0].required).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// hasRenderableAdditionalProperties (L37-43)
// ---------------------------------------------------------------------------
describe('hasRenderableAdditionalProperties edge cases', () => {
  // L39: schemaNode?.additionalProperties is falsy (undefined / false)
  it('does not render additionalProperties when it is false', () => {
    const schema = {
      properties: {
        obj: {
          type: 'object',
          additionalProperties: false,
          properties: { x: { type: 'string' } },
        },
      },
    };
    const rows = schemaToTableData(schema);
    const addlRow = rows.find((r) => r.name === 'additionalProperties');
    expect(addlRow).toBeUndefined();
  });

  it('does not render additionalProperties when it is absent', () => {
    const schema = {
      properties: {
        obj: { type: 'object', properties: { x: { type: 'string' } } },
      },
    };
    const rows = schemaToTableData(schema);
    const addlRow = rows.find((r) => r.name === 'additionalProperties');
    expect(addlRow).toBeUndefined();
  });

  // L40: typeof check — additionalProperties must be object (not boolean true)
  it('does not render additionalProperties when it is boolean true', () => {
    const schema = {
      properties: {
        obj: {
          type: 'object',
          additionalProperties: true,
        },
      },
    };
    const rows = schemaToTableData(schema);
    const addlRow = rows.find((r) => r.name === 'additionalProperties');
    expect(addlRow).toBeUndefined();
  });

  // additionalProperties is an array — should not render
  it('does not render additionalProperties when it is an array', () => {
    const schema = {
      properties: {
        obj: {
          type: 'object',
          additionalProperties: [{ type: 'string' }],
        },
      },
    };
    const rows = schemaToTableData(schema);
    const addlRow = rows.find((r) => r.name === 'additionalProperties');
    expect(addlRow).toBeUndefined();
  });

  // Valid object additionalProperties renders correctly
  it('renders additionalProperties when it is a schema object', () => {
    const schema = {
      properties: {
        obj: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    };
    const rows = schemaToTableData(schema);
    const objRow = rows.find((r) => r.name === 'obj');
    expect(objRow.containerType).toBe('object');
    const addlRow = rows.find((r) => r.name === 'additionalProperties');
    expect(addlRow).toBeDefined();
    expect(addlRow.propertyType).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// getRenderablePatternProperties (L45-53)
// ---------------------------------------------------------------------------
describe('getRenderablePatternProperties edge cases', () => {
  // L46: schemaNode?.patternProperties is absent → returns []
  it('returns no pattern property rows when patternProperties is absent', () => {
    const schema = { properties: { x: { type: 'string' } } };
    const rows = schemaToTableData(schema);
    const patternRows = rows.filter((r) =>
      r.name?.startsWith('patternProperties'),
    );
    expect(patternRows).toHaveLength(0);
  });

  // L47: Object.entries filter — non-object pattern value is skipped
  it('skips patternProperties entries that are not objects', () => {
    const schema = {
      properties: {
        obj: {
          type: 'object',
          // Include a declared property so buildPropertyChildren enters buildRows for obj
          properties: { declared: { type: 'string' } },
          patternProperties: {
            '^valid_': { type: 'string' },
            '^null_pattern': null,
            '^array_pattern': ['not', 'an', 'object'],
          },
        },
      },
    };
    const rows = schemaToTableData(schema);
    const patternRows = rows.filter((r) =>
      r.name?.startsWith('patternProperties'),
    );
    // Only the valid object schema pattern renders (null and array are skipped)
    expect(patternRows).toHaveLength(1);
    expect(patternRows[0].name).toBe('patternProperties /^valid_/');
  });

  // L48: filter condition — null value excluded
  it('skips patternProperties entry with null schema', () => {
    const schema = {
      properties: {
        obj: {
          type: 'object',
          properties: { declared: { type: 'string' } },
          patternProperties: {
            '^foo': null,
          },
        },
      },
    };
    const rows = schemaToTableData(schema);
    const patternRows = rows.filter((r) =>
      r.name?.startsWith('patternProperties'),
    );
    expect(patternRows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// isEffectivelyEmpty (L55-66)
// ---------------------------------------------------------------------------
describe('isEffectivelyEmpty edge cases', () => {
  // L57: type !== 'object' AND typeof properties === 'undefined'
  // A non-object type with no properties → isEffectivelyEmpty returns false
  // (i.e. it is NOT empty — should still render)
  it('does not filter non-object typed property even when x-gtm-clear is set', () => {
    const schema = {
      properties: {
        label: {
          'x-gtm-clear': true,
          type: 'string', // non-object, no .properties
        },
      },
    };
    const rows = schemaToTableData(schema);
    // isEffectivelyEmpty returns false for string type → not filtered
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('label');
  });

  // L57: type IS 'object' with no properties — effectively empty → filtered
  it('filters x-gtm-clear object with no properties at all', () => {
    const schema = {
      properties: {
        empty_obj: {
          'x-gtm-clear': true,
          type: 'object',
          // no .properties key
        },
        visible: { type: 'string' },
      },
    };
    const rows = schemaToTableData(schema);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('visible');
  });

  // L58: oneOf makes it NOT empty
  it('does not filter x-gtm-clear object that has oneOf', () => {
    const schema = {
      properties: {
        choice_obj: {
          'x-gtm-clear': true,
          type: 'object',
          properties: {},
          oneOf: [{ title: 'A', properties: { a: { type: 'string' } } }],
        },
      },
    };
    const rows = schemaToTableData(schema);
    const choiceObjRow = rows.find((r) => r.name === 'choice_obj');
    expect(choiceObjRow).toBeDefined();
  });

  // L58: anyOf makes it NOT empty
  it('does not filter x-gtm-clear object that has anyOf', () => {
    const schema = {
      properties: {
        any_obj: {
          'x-gtm-clear': true,
          type: 'object',
          properties: {},
          anyOf: [{ title: 'B', properties: { b: { type: 'string' } } }],
        },
      },
    };
    const rows = schemaToTableData(schema);
    const anyObjRow = rows.find((r) => r.name === 'any_obj');
    expect(anyObjRow).toBeDefined();
  });

  // L58: if makes it NOT empty
  it('does not filter x-gtm-clear object that has if', () => {
    const schema = {
      properties: {
        cond_obj: {
          'x-gtm-clear': true,
          type: 'object',
          properties: {},
          if: { properties: { x: { const: 'y' } } },
          then: { properties: { y: { type: 'string' } } },
        },
      },
    };
    const rows = schemaToTableData(schema);
    const condObjRow = rows.find((r) => r.name === 'cond_obj');
    expect(condObjRow).toBeDefined();
  });

  // L63-65: empty properties ({}) → effectively empty
  it('filters x-gtm-clear object with empty properties object', () => {
    const schema = {
      properties: {
        empty: { 'x-gtm-clear': true, type: 'object', properties: {} },
        visible: { type: 'number' },
      },
    };
    const rows = schemaToTableData(schema);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('visible');
  });

  // L65: every() — object with all-empty children → effectively empty
  it('filters x-gtm-clear object whose all children are themselves empty', () => {
    const schema = {
      properties: {
        parent: {
          'x-gtm-clear': true,
          type: 'object',
          properties: {
            child: { type: 'object', properties: {} },
          },
        },
        visible: { type: 'string' },
      },
    };
    const rows = schemaToTableData(schema);
    // parent's only child is empty → parent is effectively empty → filtered
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('visible');
  });

  // L65: every() — NOT empty when at least one child has content
  it('does NOT filter x-gtm-clear object that has at least one non-empty child', () => {
    const schema = {
      properties: {
        parent: {
          'x-gtm-clear': true,
          type: 'object',
          properties: {
            child: { type: 'string' }, // non-object type → isEffectivelyEmpty=false
          },
        },
      },
    };
    const rows = schemaToTableData(schema);
    const parentRow = rows.find((r) => r.name === 'parent');
    expect(parentRow).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// resolveContainerType / getContainerInfo (L68-136)
// ---------------------------------------------------------------------------
describe('resolveContainerType and getContainerInfo edge cases', () => {
  // L83: hasArrayItems requires type==='array' AND items with properties or if
  it('does not set containerType=array when array has items without properties or if', () => {
    const schema = {
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' }, // no .properties, no .if
        },
      },
    };
    const rows = schemaToTableData(schema);
    const tagsRow = rows.find((r) => r.name === 'tags');
    expect(tagsRow.containerType).toBeNull();
    expect(tagsRow.hasChildren).toBe(false);
  });

  it('sets containerType=array when array items have properties', () => {
    const schema = {
      properties: {
        orders: {
          type: 'array',
          items: { type: 'object', properties: { id: { type: 'string' } } },
        },
      },
    };
    const rows = schemaToTableData(schema);
    const ordersRow = rows.find((r) => r.name === 'orders');
    expect(ordersRow.containerType).toBe('array');
    expect(ordersRow.hasChildren).toBe(true);
  });

  // L83: array items with .if (no .properties) also triggers hasArrayItems
  it('sets containerType=array when array items have if but no properties', () => {
    const schema = {
      properties: {
        events: {
          type: 'array',
          items: {
            if: { properties: { kind: { const: 'special' } } },
            then: { properties: { special_field: { type: 'string' } } },
          },
        },
      },
    };
    const rows = schemaToTableData(schema);
    const eventsRow = rows.find((r) => r.name === 'events');
    expect(eventsRow.containerType).toBe('array');
    expect(eventsRow.hasChildren).toBe(true);
  });

  // L86: isConditionalWrapper with type==='object' → containerType='object'
  it('sets containerType=object for conditional wrapper with type object', () => {
    const schema = {
      properties: {
        shipping: {
          type: 'object',
          if: { properties: { method: { const: 'express' } } },
          then: { properties: { priority: { type: 'string' } } },
        },
      },
    };
    const rows = schemaToTableData(schema);
    const shippingRow = rows.find((r) => r.name === 'shipping');
    expect(shippingRow.containerType).toBe('object');
    expect(shippingRow.hasChildren).toBe(true);
  });

  // L86: isConditionalWrapper WITHOUT type==='object' → should NOT be 'object'
  it('does not set containerType=object for conditional wrapper without type object', () => {
    const schema = {
      properties: {
        cond_prop: {
          // no type specified
          if: { properties: { x: { const: 'y' } } },
          then: { properties: { y_prop: { type: 'string' } } },
        },
      },
    };
    const rows = schemaToTableData(schema);
    const condRow = rows.find((r) => r.name === 'cond_prop');
    // isConditionalWrapper=true but type !== 'object' → resolveContainerType returns null
    expect(condRow.containerType).toBeNull();
    // hasChildren is still true
    expect(condRow.hasChildren).toBe(true);
  });

  // L82-85: isChoiceWrapper with type==='object' → containerType='object'
  it('sets containerType=object for choice wrapper with type object', () => {
    const schema = {
      properties: {
        payment: {
          type: 'object',
          oneOf: [
            { title: 'Card', properties: { card_num: { type: 'string' } } },
          ],
        },
      },
    };
    const rows = schemaToTableData(schema);
    const paymentRow = rows.find(
      (r) => r.name === 'payment' && r.type === 'property',
    );
    expect(paymentRow.containerType).toBe('object');
    expect(paymentRow.hasChildren).toBe(true);
  });

  // L82-85: isChoiceWrapper with choiceOptionsAreObjects (no type) → containerType='object'
  it('sets containerType=object for choice wrapper where options have properties', () => {
    const schema = {
      properties: {
        method: {
          // no type keyword — but options have object properties
          anyOf: [
            { title: 'A', properties: { a_field: { type: 'string' } } },
            { title: 'B', properties: { b_field: { type: 'number' } } },
          ],
        },
      },
    };
    const rows = schemaToTableData(schema);
    const methodRow = rows.find(
      (r) => r.name === 'method' && r.type === 'property',
    );
    expect(methodRow).toBeDefined();
    expect(methodRow.containerType).toBe('object');
  });

  // choiceOptionsAreObjects: options with type==='object' (no .properties)
  it('sets containerType=object for choice wrapper where options have type object', () => {
    const schema = {
      properties: {
        payload: {
          oneOf: [
            { title: 'X', type: 'object' },
            { title: 'Y', type: 'string' },
          ],
        },
      },
    };
    const rows = schemaToTableData(schema);
    const payloadRow = rows.find(
      (r) => r.name === 'payload' && r.type === 'property',
    );
    expect(payloadRow).toBeDefined();
    expect(payloadRow.containerType).toBe('object');
  });

  // L104-105: hasArrayItems — items?.properties check (optional chaining)
  it('does not crash and returns hasChildren=false when items is absent', () => {
    const schema = {
      properties: {
        list: { type: 'array' }, // no items at all
      },
    };
    const rows = schemaToTableData(schema);
    const listRow = rows.find((r) => r.name === 'list');
    expect(listRow.hasChildren).toBe(false);
    expect(listRow.containerType).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildPropertyRows / buildRows (L419+)
// ---------------------------------------------------------------------------
describe('buildPropertyRows edge cases', () => {
  // L469-470: continuingLevels for non-last properties includes currentLevel
  it('includes currentLevel in continuingLevels for non-last property children', () => {
    const schema = {
      properties: {
        parent: {
          type: 'object',
          properties: {
            first: { type: 'string' },
            last: { type: 'string' },
          },
        },
        sibling: { type: 'number' },
      },
    };
    const rows = schemaToTableData(schema);
    // 'parent' is NOT last (sibling follows) → children should have level 0 in continuingLevels
    const firstRow = rows.find((r) => r.name === 'first');
    expect(firstRow.continuingLevels).toContain(0);
    const lastRow = rows.find((r) => r.name === 'last');
    expect(lastRow.continuingLevels).toContain(0);
  });

  it('does NOT include currentLevel in continuingLevels for last property children', () => {
    const schema = {
      properties: {
        parent: {
          type: 'object',
          properties: {
            child: { type: 'string' },
          },
        },
        // no sibling — parent is last
      },
    };
    const rows = schemaToTableData(schema);
    const childRow = rows.find((r) => r.name === 'child');
    expect(childRow.continuingLevels).not.toContain(0);
  });

  // L496: propertyType fallback — no type, has enum → 'enum'
  it('uses "enum" as propertyType when schema has enum but no type', () => {
    const schema = {
      properties: {
        status: {
          enum: ['active', 'inactive'],
          description: 'Status value',
        },
      },
    };
    const rows = schemaToTableData(schema);
    const statusRow = rows.find((r) => r.name === 'status');
    expect(statusRow.propertyType).toBe('enum');
  });

  // L496: propertyType fallback — no type, no enum → 'object'
  it('uses "object" as propertyType when schema has neither type nor enum', () => {
    const schema = {
      properties: {
        mystery: {
          description: 'Unknown type property',
          properties: { x: { type: 'string' } },
        },
      },
    };
    const rows = schemaToTableData(schema);
    const mysteryRow = rows.find((r) => r.name === 'mystery');
    expect(mysteryRow.propertyType).toBe('object');
  });

  // L506: isLastInGroup — last property that is also last option
  it('marks last property in group as isLastInGroup=true', () => {
    const schema = {
      properties: {
        first: { type: 'string' },
        second: { type: 'number' },
      },
    };
    const rows = schemaToTableData(schema);
    const firstRow = rows.find((r) => r.name === 'first');
    const secondRow = rows.find((r) => r.name === 'second');
    expect(firstRow.isLastInGroup).toBe(false);
    expect(secondRow.isLastInGroup).toBe(true);
  });

  // L506: isLastInGroup=false when hasSiblingChoices (sibling oneOf/if exists)
  it('marks all property rows as isLastInGroup=false when sibling choices exist', () => {
    const schema = {
      properties: {
        prop_a: { type: 'string' },
      },
      oneOf: [{ title: 'Opt', properties: { opt_prop: { type: 'string' } } }],
    };
    const rows = schemaToTableData(schema);
    const propARow = rows.find((r) => r.name === 'prop_a');
    // prop_a is the only property but hasSiblingChoices=true → not last
    expect(propARow.isLastInGroup).toBe(false);
  });

  // L532-534: groupBrackets and continuingLevels in deeply nested scenario
  it('propagates groupBrackets correctly through nested levels', () => {
    const schema = {
      properties: {
        level0: {
          type: 'object',
          properties: {
            level1: {
              type: 'object',
              properties: {
                level2: { type: 'string' },
              },
            },
          },
        },
      },
    };
    const rows = schemaToTableData(schema);
    const level2Row = rows.find((r) => r.name === 'level2');
    expect(level2Row).toBeDefined();
    expect(level2Row.level).toBe(2);
    // groupBrackets stays empty at all levels when no choice/conditional wrappers
    expect(level2Row.groupBrackets).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Root-level primitive schema (L611-625)
// ---------------------------------------------------------------------------
describe('root-level primitive schema handling', () => {
  // L615: title || '<value>' — name uses title when present
  it('uses schema title as name for root-level primitive', () => {
    const schema = {
      type: 'string',
      title: 'My Value',
      description: 'A root string value',
    };
    const rows = schemaToTableData(schema);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('My Value');
    expect(rows[0].type).toBe('property');
    expect(rows[0].propertyType).toBe('string');
  });

  // L615: title absent → '<value>'
  it('uses "<value>" as name when root-level primitive has no title', () => {
    const schema = {
      type: 'number',
      description: 'A root number',
    };
    const rows = schemaToTableData(schema);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('<value>');
    expect(rows[0].propertyType).toBe('number');
  });

  // L618: required: false for root-level primitive
  it('sets required=false for root-level primitive schema', () => {
    const schema = { type: 'boolean' };
    const rows = schemaToTableData(schema);
    expect(rows[0].required).toBe(false);
  });

  // L623: isLastInGroup: true for root-level primitive
  it('sets isLastInGroup=true for root-level primitive schema', () => {
    const schema = { type: 'string', title: 'Val' };
    const rows = schemaToTableData(schema);
    expect(rows[0].isLastInGroup).toBe(true);
  });

  // L624: continuingLevels is empty array for root-level primitive
  it('sets continuingLevels=[] for root-level primitive schema', () => {
    const schema = { type: 'integer' };
    const rows = schemaToTableData(schema);
    expect(rows[0].continuingLevels).toEqual([]);
  });

  // L625: groupBrackets is empty array for root-level primitive
  it('sets groupBrackets=[] for root-level primitive schema', () => {
    const schema = { type: 'string' };
    const rows = schemaToTableData(schema);
    expect(rows[0].groupBrackets).toEqual([]);
  });

  // L614: returns a property row (not choice or conditional)
  it('root-level primitive is type=property', () => {
    const schema = { type: 'string' };
    const rows = schemaToTableData(schema);
    expect(rows[0].type).toBe('property');
  });

  // Root-level primitive with parentContinuingLevels passed in
  it('uses parentContinuingLevels when passed for root-level primitive', () => {
    const schema = { type: 'string' };
    const rows = schemaToTableData(schema, 1, ['some', 'path'], [0], false, []);
    expect(rows[0].continuingLevels).toEqual([0]);
  });

  // Root-level primitive does NOT render when schema also has properties
  it('does not render primitive row when schema has both type and properties', () => {
    const schema = {
      type: 'object',
      properties: { x: { type: 'string' } },
    };
    const rows = schemaToTableData(schema);
    // Only property row for 'x', not a primitive row
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('x');
  });
});

// ---------------------------------------------------------------------------
// Additional logical combination coverage
// ---------------------------------------------------------------------------
describe('additional logical branch coverage', () => {
  // hasChildren: true when isConditionalWrapper (if+then but no properties)
  it('sets hasChildren=true when prop has if/then but no properties', () => {
    const schema = {
      properties: {
        cond: {
          type: 'object',
          if: { properties: { x: { const: 'y' } } },
          then: { properties: { y: { type: 'string' } } },
        },
      },
    };
    const rows = schemaToTableData(schema);
    const condRow = rows.find((r) => r.name === 'cond');
    expect(condRow.hasChildren).toBe(true);
  });

  // isChoiceWrapper false when neither oneOf nor anyOf
  it('sets hasChildren=false for plain primitive property', () => {
    const schema = {
      properties: { plain: { type: 'string' } },
    };
    const rows = schemaToTableData(schema);
    expect(rows[0].hasChildren).toBe(false);
    expect(rows[0].containerType).toBeNull();
  });

  // Verify required constraint bubbles into constraints array
  it('prepends "required" to constraints when property is required', () => {
    const schema = {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
    };
    const rows = schemaToTableData(schema);
    const nameRow = rows.find((r) => r.name === 'name');
    const ageRow = rows.find((r) => r.name === 'age');
    expect(nameRow.required).toBe(true);
    expect(nameRow.constraints[0]).toBe('required');
    expect(ageRow.required).toBe(false);
  });

  // isConditionalWrapper requires both if AND (then OR else)
  it('does not treat schema with if but no then/else as conditional wrapper', () => {
    const schema = {
      properties: {
        ambiguous: {
          type: 'object',
          if: { properties: { x: { const: 'y' } } },
          // no then, no else
          properties: { x: { type: 'string' } },
        },
      },
    };
    const rows = schemaToTableData(schema);
    const ambiguousRow = rows.find((r) => r.name === 'ambiguous');
    expect(ambiguousRow).toBeDefined();
    // hasChildren from properties, not from conditional
    expect(ambiguousRow.hasChildren).toBe(true);
    // No conditional row emitted for this property
    const conditional = rows.find((r) => r.type === 'conditional');
    expect(conditional).toBeUndefined();
  });

  // Both then and else present → two branches
  it('creates two branches when schema has both then and else', () => {
    const schema = {
      type: 'object',
      properties: { flag: { type: 'boolean' } },
      if: { properties: { flag: { const: true } } },
      then: { properties: { when_true: { type: 'string' } } },
      else: { properties: { when_false: { type: 'number' } } },
    };
    const rows = schemaToTableData(schema);
    const conditional = rows.find((r) => r.type === 'conditional');
    expect(conditional.branches).toHaveLength(2);
    expect(conditional.branches[0].title).toBe('Then');
    expect(conditional.branches[1].title).toBe('Else');
  });

  // schemaToTableData with no properties and no type — returns empty
  it('returns empty array for empty schema object', () => {
    const rows = schemaToTableData({});
    expect(rows).toHaveLength(0);
  });

  // additionalProperties on an object without .properties (type=object, no .properties)
  it('renders additionalProperties even when there are no declared properties', () => {
    const schema = {
      properties: {
        free_form: {
          type: 'object',
          additionalProperties: { type: 'string' },
          // no .properties keyword
        },
      },
    };
    const rows = schemaToTableData(schema);
    const freeFormRow = rows.find((r) => r.name === 'free_form');
    expect(freeFormRow.containerType).toBe('object');
    const addlRow = rows.find((r) => r.name === 'additionalProperties');
    expect(addlRow).toBeDefined();
  });
});
