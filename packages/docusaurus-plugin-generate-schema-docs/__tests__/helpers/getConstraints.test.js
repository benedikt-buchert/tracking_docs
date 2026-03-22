import { getConstraints } from '../../helpers/getConstraints';

describe('getConstraints', () => {
  it('should return "required" if isReq is true', () => {
    expect(getConstraints({}, true)).toEqual(['required']);
  });

  it('should return an empty array if isReq is false and there are no other constraints', () => {
    expect(getConstraints({}, false)).toEqual([]);
  });

  it('should handle simple key-value constraints', () => {
    const prop = {
      minLength: 1,
      maxLength: 10,
      minimum: 0,
      maximum: 100,
      exclusiveMinimum: 0,
      exclusiveMaximum: 100,
      minItems: 1,
      maxItems: 5,
      minProperties: 2,
      maxProperties: 3,
      multipleOf: 2,
      format: 'email',
      minContains: 1,
      maxContains: 3,
    };
    const expected = [
      'minLength: 1',
      'maxLength: 10',
      'minimum: 0',
      'maximum: 100',
      'exclusiveMinimum: 0',
      'exclusiveMaximum: 100',
      'minItems: 1',
      'maxItems: 5',
      'minProperties: 2',
      'maxProperties: 3',
      'multipleOf: 2',
      'format: email',
      'minContains: 1',
      'maxContains: 3',
    ];
    expect(getConstraints(prop, false)).toEqual(
      expect.arrayContaining(expected),
    );
  });

  it('should handle special-cased constraints', () => {
    const prop = {
      pattern: '^[a-z]+$',
      uniqueItems: true,
      additionalProperties: false,
      propertyNames: { pattern: '^[A-Z][a-zA-Z0-9]*$' },
      dependentRequired: {
        prop1: ['prop2', 'prop3'],
      },
      contains: { type: 'string' },
      enum: ['a', 'b', 'c'],
      const: 'hello',
      not: { const: 'US' },
    };
    const expected = [
      'pattern: /^[a-z]+$/',
      'uniqueItems: true',
      'additionalProperties: false',
      'propertyNames: {"pattern":"^[A-Z][a-zA-Z0-9]*$"}',
      'dependentRequired: prop1 -> [prop2, prop3]',
      'contains: {"type":"string"}',
      'enum: [a, b, c]',
      'const: "hello"',
      'not: { const: "US" }',
    ];
    expect(getConstraints(prop, false)).toEqual(
      expect.arrayContaining(expected),
    );
  });

  it('should handle default constraint', () => {
    const prop = {
      default: 'default value',
    };
    const expected = ['default: "default value"'];
    expect(getConstraints(prop, false)).toEqual(expected);
  });

  it('should not include a constraint for a value of undefined', () => {
    const prop = {
      minLength: undefined,
    };
    expect(getConstraints(prop, false)).toEqual([]);
  });

  it('should handle a mix of constraints', () => {
    const prop = {
      minLength: 5,
      pattern: '^[a-zA-Z0-9]*$',
    };
    const expected = ['minLength: 5', 'pattern: /^[a-zA-Z0-9]*$/'];
    expect(getConstraints(prop, true)).toEqual(
      expect.arrayContaining(['required', ...expected]),
    );
  });

  it('should render "not" constraint in JSON schema syntax for const', () => {
    const prop = {
      not: { const: 'US' },
    };
    expect(getConstraints(prop, false)).toEqual(['not: { const: "US" }']);
  });

  it('should render "not" constraint in JSON schema syntax for type', () => {
    const prop = {
      not: { type: 'string' },
    };
    expect(getConstraints(prop, false)).toEqual(['not: { type: "string" }']);
  });

  it('should not include uniqueItems constraint when value is false', () => {
    const prop = { uniqueItems: false };
    expect(getConstraints(prop, false)).toEqual([]);
  });

  it('should not include additionalProperties constraint when value is true', () => {
    const prop = { additionalProperties: true };
    expect(getConstraints(prop, false)).toEqual([]);
  });

  it('should render "not" constraint with nested array values', () => {
    const prop = {
      not: { enum: ['a', 'b'] },
    };
    expect(getConstraints(prop, false)).toEqual(['not: { enum: ["a", "b"] }']);
  });

  it('should render "not" constraint with deeply nested array of objects', () => {
    const prop = {
      not: { items: [{ type: 'string' }, { type: 'number' }] },
    };
    const result = getConstraints(prop, false);
    expect(result).toEqual([
      'not: { items: [{ type: "string" }, { type: "number" }] }',
    ]);
  });
});
