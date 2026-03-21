'use strict';

const {
  PROPERTY_DEFINITION_SELECTOR,
  getKeys,
  isInsideIfBlock,
  isPureRef,
  isConstraintOnlyRefinement,
} = require('../helpers/property-definition');

describe('PROPERTY_DEFINITION_SELECTOR', () => {
  it('is a non-empty string selector', () => {
    expect(typeof PROPERTY_DEFINITION_SELECTOR).toBe('string');
    expect(PROPERTY_DEFINITION_SELECTOR.length).toBeGreaterThan(0);
  });
});

describe('isInsideIfBlock', () => {
  it('returns true when the ancestor key is "if"', () => {
    const node = {
      parent: {
        parent: {
          parent: {
            parent: { key: { value: 'if' } },
          },
        },
      },
    };
    expect(isInsideIfBlock(node)).toBe(true);
  });

  it('returns false when the ancestor key is "then"', () => {
    const node = {
      parent: {
        parent: {
          parent: {
            parent: { key: { value: 'then' } },
          },
        },
      },
    };
    expect(isInsideIfBlock(node)).toBe(false);
  });

  it('returns false when node.parent is undefined', () => {
    expect(isInsideIfBlock({})).toBe(false);
  });

  it('returns false when node.parent.parent is undefined', () => {
    expect(isInsideIfBlock({ parent: {} })).toBe(false);
  });

  it('returns false when propertiesKey.parent is undefined', () => {
    expect(isInsideIfBlock({ parent: { parent: {} } })).toBe(false);
  });

  it('returns false when blockValue.parent is undefined', () => {
    expect(isInsideIfBlock({ parent: { parent: { parent: {} } } })).toBe(false);
  });

  it('returns false when blockKey has no key property', () => {
    expect(
      isInsideIfBlock({ parent: { parent: { parent: { parent: {} } } } }),
    ).toBe(false);
  });

  it('returns false when blockKey.key has no value property', () => {
    expect(
      isInsideIfBlock({
        parent: { parent: { parent: { parent: { key: {} } } } },
      }),
    ).toBe(false);
  });
});

describe('isPureRef', () => {
  it('returns true when keys has only $ref', () => {
    expect(isPureRef(new Set(['$ref']))).toBe(true);
  });

  it('returns false when keys has $ref plus other keys', () => {
    expect(isPureRef(new Set(['$ref', 'description']))).toBe(false);
  });

  it('returns false when keys has only one key that is not $ref', () => {
    expect(isPureRef(new Set(['type']))).toBe(false);
  });

  it('returns false when keys is empty', () => {
    expect(isPureRef(new Set())).toBe(false);
  });

  it('requires both size === 1 AND has($ref) — not just one condition', () => {
    // size is 1 but no $ref → false
    expect(isPureRef(new Set(['type']))).toBe(false);
    // has $ref but size > 1 → false
    expect(isPureRef(new Set(['$ref', 'type']))).toBe(false);
  });
});

describe('isConstraintOnlyRefinement', () => {
  it('returns true when all keys are constraint-only', () => {
    expect(isConstraintOnlyRefinement(new Set(['maxLength', 'pattern']))).toBe(
      true,
    );
  });

  it('returns false when keys include an annotation key', () => {
    expect(
      isConstraintOnlyRefinement(new Set(['maxLength', 'description'])),
    ).toBe(false);
  });

  it('returns false when keys include a structural key', () => {
    expect(isConstraintOnlyRefinement(new Set(['type', 'maxLength']))).toBe(
      false,
    );
  });

  it('returns false when keys include only annotation keys', () => {
    expect(isConstraintOnlyRefinement(new Set(['type', 'description']))).toBe(
      false,
    );
  });

  it('uses some() not every() — one annotation key is enough to return false', () => {
    // mix of constraint + annotation keys
    const keys = new Set(['minimum', 'maximum', 'type']);
    expect(isConstraintOnlyRefinement(keys)).toBe(false);
  });

  it('returns true for a single constraint key', () => {
    expect(isConstraintOnlyRefinement(new Set(['minLength']))).toBe(true);
  });
});

describe('getKeys', () => {
  it('returns a set of key values from a definition node', () => {
    const definitionNode = {
      properties: [
        { key: { value: 'type' } },
        { key: { value: 'description' } },
      ],
    };
    const keys = getKeys(definitionNode);
    expect(keys).toEqual(new Set(['type', 'description']));
  });

  it('falls back to key.name when key.value is undefined', () => {
    const definitionNode = {
      properties: [{ key: { name: 'type', value: undefined } }],
    };
    const keys = getKeys(definitionNode);
    expect(keys).toEqual(new Set(['type']));
  });
});
