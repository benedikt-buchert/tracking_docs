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

  it('generates android kotlin firebase snippet', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'android-firebase-kotlin-sdk',
      example: {
        event: 'share_image',
        image_name: 'hero.jpg',
        count: 2,
        score: 4.5,
        premium: true,
      },
      schema: { properties: {} },
    });

    expect(snippet).toContain('firebaseAnalytics.logEvent("share_image")');
    expect(snippet).toContain('param("image_name", "hero.jpg")');
    expect(snippet).toContain('param("count", 2L)');
    expect(snippet).toContain('param("score", 4.5)');
    expect(snippet).toContain('param("premium", 1L)');
  });

  it('generates android java firebase snippet', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'android-firebase-java-sdk',
      example: {
        event: 'share_image',
        image_name: 'hero.jpg',
        count: 2,
        score: 4.5,
        premium: false,
      },
      schema: { properties: {} },
    });

    expect(snippet).toContain('Bundle params = new Bundle();');
    expect(snippet).toContain('params.putString("image_name", "hero.jpg");');
    expect(snippet).toContain('params.putLong("count", 2L);');
    expect(snippet).toContain('params.putDouble("score", 4.5);');
    expect(snippet).toContain('params.putLong("premium", 0L);');
    expect(snippet).toContain(
      'mFirebaseAnalytics.logEvent("share_image", params);',
    );
  });

  it('generates ios swift firebase snippet', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'ios-firebase-swift-sdk',
      example: {
        event: 'share_image',
        image_name: 'hero.jpg',
        count: 2,
        score: 4.5,
        premium: true,
      },
      schema: { properties: {} },
    });

    expect(snippet).toContain(
      'Analytics.logEvent("share_image", parameters: [',
    );
    expect(snippet).toContain('"image_name": "hero.jpg"');
    expect(snippet).toContain('"count": 2');
    expect(snippet).toContain('"score": 4.5');
    expect(snippet).toContain('"premium": 1');
  });

  it('generates ios objective-c firebase snippet', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'ios-firebase-objc-sdk',
      example: {
        event: 'share_image',
        image_name: 'hero.jpg',
        count: 2,
        score: 4.5,
        premium: false,
      },
      schema: { properties: {} },
    });

    expect(snippet).toContain('[FIRAnalytics logEventWithName:@"share_image"');
    expect(snippet).toContain('@"image_name": @"hero.jpg"');
    expect(snippet).toContain('@"count": @(2)');
    expect(snippet).toContain('@"score": @(4.5)');
    expect(snippet).toContain('@"premium": @(0)');
  });

  it('includes fallback warning comment when nested values are serialized', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'android-firebase-kotlin-sdk',
      example: {
        event: 'checkout',
        ecommerce: { currency: 'EUR', items: [{ sku: 'abc' }] },
      },
      schema: { properties: {} },
    });

    expect(snippet).toContain('WARNING');
    expect(snippet).toContain('serialized to JSON string');
    expect(snippet).toContain('param("ecommerce",');
  });
});
