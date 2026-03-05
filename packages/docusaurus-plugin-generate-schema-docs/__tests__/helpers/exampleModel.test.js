import { buildExampleModel, DEFAULT_SNIPPET_TARGET } from '../../helpers/exampleModel';
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
    expect(model.targets).toEqual([DEFAULT_SNIPPET_TARGET]);
    expect(model.isSimpleDefault).toBe(true);
    expect(model.variantGroups).toHaveLength(1);
    expect(model.variantGroups[0].property).toBe('default');
    expect(
      model.variantGroups[0].options[0].snippets[DEFAULT_SNIPPET_TARGET.id],
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
      model.variantGroups[0].options[0].snippets[DEFAULT_SNIPPET_TARGET.id],
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

  it('uses configured dataLayerName in snippets', () => {
    const schema = {
      type: 'object',
      properties: {
        event: { type: 'string', examples: ['test_event'] },
      },
    };

    const model = buildExampleModel(schema, { dataLayerName: 'customDataLayer' });
    expect(
      model.variantGroups[0].options[0].snippets[DEFAULT_SNIPPET_TARGET.id],
    ).toContain('window.customDataLayer.push');
  });
});
