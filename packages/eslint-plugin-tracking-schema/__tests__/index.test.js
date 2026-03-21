/**
 * @jest-environment @stryker-mutator/jest-runner/jest-env/node
 */

const plugin = require('../index');
const requireDescription = require('../rules/require-description');
const requireType = require('../rules/require-type');
const requireExamples = require('../rules/require-examples');

describe('eslint-plugin-tracking-schema index', () => {
  describe('plugin.rules', () => {
    it('has a rules object', () => {
      expect(plugin.rules).toBeTruthy();
      expect(typeof plugin.rules).toBe('object');
    });

    it('has require-description rule', () => {
      expect(plugin.rules['require-description']).toBeTruthy();
    });

    it('has require-type rule', () => {
      expect(plugin.rules['require-type']).toBeTruthy();
    });

    it('has require-examples rule', () => {
      expect(plugin.rules['require-examples']).toBeTruthy();
    });

    it('require-description is the same object as the required module', () => {
      expect(plugin.rules['require-description']).toBe(requireDescription);
    });

    it('require-type is the same object as the required module', () => {
      expect(plugin.rules['require-type']).toBe(requireType);
    });

    it('require-examples is the same object as the required module', () => {
      expect(plugin.rules['require-examples']).toBe(requireExamples);
    });
  });

  describe('plugin.configs', () => {
    it('has a configs object', () => {
      expect(plugin.configs).toBeTruthy();
      expect(typeof plugin.configs).toBe('object');
    });

    it('has a recommended config', () => {
      expect(plugin.configs.recommended).toBeTruthy();
    });

    it('recommended.plugins contains tracking-schema', () => {
      expect(plugin.configs.recommended.plugins).toContain('tracking-schema');
    });

    it('recommended.overrides is an array with at least one entry', () => {
      expect(Array.isArray(plugin.configs.recommended.overrides)).toBe(true);
      expect(plugin.configs.recommended.overrides.length).toBeGreaterThan(0);
    });

    it('recommended.overrides[0].files contains **/*.json', () => {
      expect(plugin.configs.recommended.overrides[0].files).toContain(
        '**/*.json',
      );
    });

    it('recommended.overrides[0].parser equals jsonc-eslint-parser', () => {
      expect(plugin.configs.recommended.overrides[0].parser).toBe(
        'jsonc-eslint-parser',
      );
    });

    it('recommended.overrides[0].rules has tracking-schema/require-description set to warn', () => {
      expect(
        plugin.configs.recommended.overrides[0].rules[
          'tracking-schema/require-description'
        ],
      ).toBe('warn');
    });

    it('recommended.overrides[0].rules has tracking-schema/require-type set to error', () => {
      expect(
        plugin.configs.recommended.overrides[0].rules[
          'tracking-schema/require-type'
        ],
      ).toBe('error');
    });

    it('recommended.overrides[0].rules has tracking-schema/require-examples set to warn', () => {
      expect(
        plugin.configs.recommended.overrides[0].rules[
          'tracking-schema/require-examples'
        ],
      ).toBe('warn');
    });
  });
});
