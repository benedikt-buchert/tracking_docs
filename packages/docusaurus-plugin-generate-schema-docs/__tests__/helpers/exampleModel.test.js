import {
  buildExampleModel,
  resolveExampleTargets,
} from '../../helpers/exampleModel';
import { DEFAULT_SNIPPET_TARGET_ID } from '../../helpers/snippetTargets';
import choiceEventSchema from '../__fixtures__/static/schemas/choice-event.json';
import conditionalEventSchema from '../__fixtures__/static/schemas/conditional-event.json';

describe('buildExampleModel', () => {
  it('builds a default model for simple schema', () => {
    const schema = {
      type: 'object',
      properties: {
        event: { type: 'string', examples: ['test_event'] },
      },
    };

    const model = buildExampleModel(schema);
    expect(model.targets.map((t) => t.id)).toEqual([DEFAULT_SNIPPET_TARGET_ID]);
    expect(model.isSimpleDefault).toBe(true);
    expect(model.variantGroups).toHaveLength(1);
    expect(model.variantGroups[0].property).toBe('default');
    expect(
      model.variantGroups[0].options[0].snippets[DEFAULT_SNIPPET_TARGET_ID],
    ).toContain('window.dataLayer.push');
  });

  it('builds grouped variants for choice schemas', () => {
    const model = buildExampleModel(choiceEventSchema);
    const groupProperties = model.variantGroups.map((group) => group.property);

    expect(model.isSimpleDefault).toBe(false);
    expect(groupProperties).toEqual(
      expect.arrayContaining(['user_id', 'payment_method']),
    );
    expect(
      model.variantGroups[0].options[0].snippets[DEFAULT_SNIPPET_TARGET_ID],
    ).toContain('window.dataLayer.push');
  });

  it('builds conditional variants for if-then-else schemas', () => {
    const model = buildExampleModel(conditionalEventSchema);
    const conditionalGroup = model.variantGroups.find(
      (group) => group.property === 'conditional',
    );

    expect(conditionalGroup).toBeDefined();
    expect(conditionalGroup.options).toHaveLength(2);
    expect(conditionalGroup.options.map((o) => o.title)).toEqual(
      expect.arrayContaining([
        'When condition is met',
        'When condition is not met',
      ]),
    );
  });

  it('builds distinct conditional examples for required-only branches', () => {
    const model = buildExampleModel({
      type: 'object',
      properties: {
        platform: {
          type: 'string',
          examples: ['ios'],
        },
        att_status: {
          type: 'string',
          examples: ['authorized'],
        },
        ad_personalization_enabled: {
          type: 'boolean',
          examples: [true],
        },
      },
      if: {
        properties: {
          platform: {
            const: 'ios',
          },
        },
        required: ['platform'],
      },
      then: {
        required: ['att_status'],
      },
      else: {
        required: ['ad_personalization_enabled'],
      },
    });
    const conditionalGroup = model.variantGroups.find(
      (group) => group.property === 'conditional',
    );

    expect(conditionalGroup).toBeDefined();
    expect(conditionalGroup.options[0].example).toEqual({
      platform: 'ios',
      att_status: 'authorized',
    });
    expect(conditionalGroup.options[1].example).toEqual({
      platform: 'ios',
      ad_personalization_enabled: true,
    });
  });

  it('uses configured dataLayerName in snippets', () => {
    const schema = {
      type: 'object',
      properties: {
        event: { type: 'string', examples: ['test_event'] },
      },
    };

    const model = buildExampleModel(schema, {
      dataLayerName: 'customDataLayer',
    });
    expect(
      model.variantGroups[0].options[0].snippets[DEFAULT_SNIPPET_TARGET_ID],
    ).toContain('window.customDataLayer.push');
  });

  it('resolves multiple targets when x-tracking-targets is provided', () => {
    const schema = {
      'x-tracking-targets': ['web-datalayer-js', 'android-firebase-kotlin-sdk'],
      type: 'object',
      properties: {
        event: { type: 'string', examples: ['test_event'] },
      },
    };

    const targets = resolveExampleTargets(schema);
    expect(targets.map((target) => target.id)).toEqual([
      'web-datalayer-js',
      'android-firebase-kotlin-sdk',
    ]);
  });

  it('falls back to default target when x-tracking-targets is null (optional chain)', () => {
    const schema = {
      'x-tracking-targets': null,
      type: 'object',
      properties: {
        event: { type: 'string', examples: ['test_event'] },
      },
    };

    const targets = resolveExampleTargets(schema);
    expect(targets.map((t) => t.id)).toEqual([DEFAULT_SNIPPET_TARGET_ID]);
  });

  it('falls back to default target when x-tracking-targets is an empty array', () => {
    const schema = {
      'x-tracking-targets': [],
      type: 'object',
      properties: {
        event: { type: 'string', examples: ['test_event'] },
      },
    };

    const targets = resolveExampleTargets(schema);
    expect(targets.map((t) => t.id)).toEqual([DEFAULT_SNIPPET_TARGET_ID]);
    expect(targets).toHaveLength(1);
  });

  it('filters out null targets and falls back to default when all target IDs are invalid', () => {
    const schema = {
      'x-tracking-targets': ['nonexistent-target-id'],
      type: 'object',
      properties: {
        event: { type: 'string', examples: ['test_event'] },
      },
    };

    // All invalid IDs should be caught, filtered out, then fall back to default
    const targets = resolveExampleTargets(schema);
    expect(targets.map((t) => t.id)).toEqual([DEFAULT_SNIPPET_TARGET_ID]);
  });

  it('filters out null when one target ID is invalid but keeps valid ones', () => {
    const schema = {
      'x-tracking-targets': [
        'web-datalayer-js',
        'nonexistent-target-id',
        'android-firebase-kotlin-sdk',
      ],
      type: 'object',
      properties: {
        event: { type: 'string', examples: ['test_event'] },
      },
    };

    const targets = resolveExampleTargets(schema);
    expect(targets.map((t) => t.id)).toEqual([
      'web-datalayer-js',
      'android-firebase-kotlin-sdk',
    ]);
  });

  it('returns empty variantGroups and isSimpleDefault false when schema produces no examples', () => {
    // A schema with type object but no properties and no examples yields no example groups
    const schema = {
      type: 'object',
    };

    const model = buildExampleModel(schema);
    expect(model.variantGroups).toEqual([]);
    expect(model.isSimpleDefault).toBe(false);
    expect(model.targets).toHaveLength(1);
    expect(model.targets[0].id).toBe(DEFAULT_SNIPPET_TARGET_ID);
  });

  it('sets isSimpleDefault to false when there are multiple variantGroups', () => {
    const model = buildExampleModel(choiceEventSchema);
    expect(model.isSimpleDefault).toBe(false);
    expect(model.variantGroups.length).toBeGreaterThan(1);
  });

  it('sets isSimpleDefault to false when single variantGroup property is not "default"', () => {
    // A schema with exactly one oneOf choice point produces a single variantGroup
    // whose property is the field name (not 'default')
    const schema = {
      type: 'object',
      properties: {
        event: { type: 'string', examples: ['test_event'] },
        category: {
          oneOf: [
            { title: 'Standard', const: 'standard' },
            { title: 'Premium', const: 'premium' },
          ],
        },
      },
    };

    const model = buildExampleModel(schema);
    expect(model.variantGroups).toHaveLength(1);
    expect(model.variantGroups[0].property).not.toBe('default');
    expect(model.isSimpleDefault).toBe(false);
  });

  it('falls back to default target when schema is undefined (optional chaining guard)', () => {
    const targets = resolveExampleTargets(undefined);
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe(DEFAULT_SNIPPET_TARGET_ID);
  });

  it('falls back to default target when schema is null (optional chaining guard)', () => {
    const targets = resolveExampleTargets(null);
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe(DEFAULT_SNIPPET_TARGET_ID);
  });

  it('uses configured array content (not empty) when x-tracking-targets is absent', () => {
    // Kills ArrayDeclaration mutant: [DEFAULT_SNIPPET_TARGET_ID] -> []
    // If the fallback were [], targets would be empty, triggering the line-27 fallback
    // but the target IDs would differ in the mapping step
    const schema = { type: 'object' };
    const targets = resolveExampleTargets(schema);
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe(DEFAULT_SNIPPET_TARGET_ID);
  });

  it('treats non-array x-tracking-targets as absent and falls back to default', () => {
    // Kills ConditionalExpression mutant on line 12: configured.length > 0 -> true
    // When configured is a string (truthy but not an Array), Array.isArray is false
    // so it should still fall back to default
    const schema = {
      'x-tracking-targets': 'not-an-array',
      type: 'object',
    };
    const targets = resolveExampleTargets(schema);
    expect(targets).toHaveLength(1);
    expect(targets[0].id).toBe(DEFAULT_SNIPPET_TARGET_ID);
  });

  it('generates option ids from property name and index', () => {
    // Kills StringLiteral mutant: `${group.property}-${index}` -> ``
    const schema = {
      type: 'object',
      properties: {
        event: { type: 'string', examples: ['test_event'] },
      },
    };

    const model = buildExampleModel(schema);
    expect(model.variantGroups[0].options[0].id).toBe('default-0');
  });

  it('generates sequential option ids for choice schemas', () => {
    // Further kills StringLiteral mutant by checking index > 0
    const schema = {
      type: 'object',
      properties: {
        event: { type: 'string', examples: ['test_event'] },
        category: {
          oneOf: [
            { title: 'Standard', const: 'standard' },
            { title: 'Premium', const: 'premium' },
          ],
        },
      },
    };

    const model = buildExampleModel(schema);
    const group = model.variantGroups[0];
    expect(group.options[0].id).toBe(`${group.property}-0`);
    expect(group.options[1].id).toBe(`${group.property}-1`);
  });

  it('sets isSimpleDefault to false for multiple groups even if first is "default"', () => {
    // Kills ConditionalExpression mutant on line 66: variantGroups.length === 1 -> true
    // choiceEventSchema produces multiple variant groups, so isSimpleDefault must be false
    // even if the mutant forces length===1 to true
    const model = buildExampleModel(choiceEventSchema);
    expect(model.variantGroups.length).toBeGreaterThan(1);
    expect(model.isSimpleDefault).toBe(false);
  });

  it('returns early return shape when schema has no properties', () => {
    // Kills BlockStatement and condition mutants on line 34
    // Verifies the exact shape of the early-return object
    const schema = { type: 'object' };
    const model = buildExampleModel(schema);
    expect(model).toEqual({
      targets: expect.any(Array),
      variantGroups: [],
      isSimpleDefault: false,
    });
  });

  it('includes snippets keyed by each target id when multiple targets are configured', () => {
    const schema = {
      'x-tracking-targets': ['web-datalayer-js', 'android-firebase-kotlin-sdk'],
      type: 'object',
      properties: {
        event: { type: 'string', examples: ['test_event'] },
      },
    };

    const model = buildExampleModel(schema);
    const snippetKeys = Object.keys(model.variantGroups[0].options[0].snippets);
    expect(snippetKeys).toEqual([
      'web-datalayer-js',
      'android-firebase-kotlin-sdk',
    ]);
  });
});
