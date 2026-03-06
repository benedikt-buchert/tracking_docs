import {
  DEFAULT_SNIPPET_TARGET_ID,
  generateSnippetForTarget,
  getSnippetTarget,
  SNIPPET_TARGETS,
} from '../../helpers/snippetTargets';

describe('snippetTargets', () => {
  it('exposes expected baseline target ids', () => {
    expect(SNIPPET_TARGETS.map((target) => target.id)).toEqual(
      expect.arrayContaining([
        'web-datalayer-js',
        'android-firebase-kotlin-sdk',
        'android-firebase-java-sdk',
        'ios-firebase-swift-sdk',
        'ios-firebase-objc-sdk',
      ]),
    );
  });

  it('resolves the default target when no id is provided', () => {
    const target = getSnippetTarget();
    expect(target.id).toBe(DEFAULT_SNIPPET_TARGET_ID);
  });

  it('throws for unknown target id', () => {
    expect(() => getSnippetTarget('unknown-target-id')).toThrow(
      'Unknown snippet target',
    );
  });

  it('generates web-datalayer snippet using configurable dataLayerName', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'web-datalayer-js',
      example: { event: 'test_event' },
      schema: {
        properties: {
          ecommerce: { 'x-gtm-clear': true, type: 'object' },
          event: { type: 'string' },
        },
      },
      config: {
        dataLayerName: 'customDataLayer',
      },
    });

    expect(snippet).toContain('window.customDataLayer.push');
    expect(snippet).toContain('"event": "test_event"');
  });
});
