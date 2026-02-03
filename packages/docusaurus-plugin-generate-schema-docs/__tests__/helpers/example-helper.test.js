import {
  getExamples,
  getSingleExampleValue,
} from '../../helpers/example-helper';

describe('example-helper', () => {
  describe('getExamples', () => {
    it('returns "const" as the only example when present', () => {
      const schema = {
        examples: ['example1'],
        const: 'const-value',
      };
      expect(getExamples(schema)).toEqual(['const-value']);
    });

    it('aggregates "examples", "example", and "default"', () => {
      const schema = {
        examples: ['example1'],
        example: 'example2',
        default: 'default-value',
      };
      expect(getExamples(schema)).toEqual([
        'example1',
        'example2',
        'default-value',
      ]);
    });

    it('handles duplicates', () => {
      const schema = {
        examples: ['example1'],
        example: 'example1',
        default: 'example1',
      };
      expect(getExamples(schema)).toEqual(['example1']);
    });
  });

  describe('getSingleExampleValue', () => {
    it('returns "const" when present', () => {
      const schema = {
        const: 'const-value',
        examples: ['example1'],
      };
      expect(getSingleExampleValue(schema)).toBe('const-value');
    });

    it('returns the first "examples" when "const" is not present', () => {
      const schema = {
        examples: ['example1', 'example2'],
        default: 'default-value',
      };
      expect(getSingleExampleValue(schema)).toBe('example1');
    });

    it('returns "example" when "const" and "examples" are not present', () => {
      const schema = {
        example: 'example',
        default: 'default-value',
      };
      expect(getSingleExampleValue(schema)).toBe('example');
    });

    it('returns "default" as a fallback', () => {
      const schema = {
        default: 'default-value',
      };
      expect(getSingleExampleValue(schema)).toBe('default-value');
    });
  });
});
