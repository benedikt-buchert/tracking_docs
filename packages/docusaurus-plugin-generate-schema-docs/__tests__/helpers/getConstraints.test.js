import { getConstraints } from '../../helpers/getConstraints';

describe('getConstraints', () => {
  it('should return "required" if isReq is true', () => {
    const constraints = getConstraints({}, true);
    expect(constraints).toContain('required');
  });

  it('should handle simple key-value constraints', () => {
    const prop = {
      minLength: 1,
      maxLength: 10,
      minimum: 0,
      maximum: 100,
      minItems: 1,
      maxItems: 5,
    };
    const constraints = getConstraints(prop, false);
    expect(constraints).toEqual([
      'minLength: 1',
      'maxLength: 10',
      'minimum: 0',
      'maximum: 100',
      'minItems: 1',
      'maxItems: 5',
    ]);
  });

  it('should handle pattern constraint', () => {
    const prop = { pattern: '^[a-z]+$' };
    const constraints = getConstraints(prop, false);
    expect(constraints).toContain('pattern: /^[a-z]+$/');
  });

  it('should handle uniqueItems constraint', () => {
    const prop = { uniqueItems: true };
    const constraints = getConstraints(prop, false);
    expect(constraints).toContain('uniqueItems: true');
  });

  it('should handle additionalProperties constraint', () => {
    const prop = { additionalProperties: false };
    const constraints = getConstraints(prop, false);
    expect(constraints).toContain('additionalProperties: false');
  });

  it('should handle enum constraint', () => {
    const prop = { enum: ['a', 'b', 'c'] };
    const constraints = getConstraints(prop, false);
    expect(constraints).toContain('enum: [a, b, c]');
  });

  it('should handle const constraint', () => {
    const prop = { const: 'a' };
    const constraints = getConstraints(prop, false);
    expect(constraints).toContain('const: "a"');
  });
});
