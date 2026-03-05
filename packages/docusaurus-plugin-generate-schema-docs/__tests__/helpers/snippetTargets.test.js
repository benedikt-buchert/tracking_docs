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

    expect(snippet).toContain('Bundle purchaseParams = new Bundle();');
    expect(snippet).toContain(
      'purchaseParams.putString("image_name", "hero.jpg");',
    );
    expect(snippet).toContain('purchaseParams.putLong("count", 2L);');
    expect(snippet).toContain('purchaseParams.putDouble("score", 4.5);');
    expect(snippet).toContain('purchaseParams.putLong("premium", 0L);');
    expect(snippet).toContain(
      'mFirebaseAnalytics.logEvent("share_image", purchaseParams);',
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

    expect(snippet).toContain('var purchaseParams: [String: Any] = [');
    expect(snippet).toContain('"image_name": "hero.jpg"');
    expect(snippet).toContain('"count": 2');
    expect(snippet).toContain('"score": 4.5');
    expect(snippet).toContain('"premium": 1');
    expect(snippet).toContain(
      'Analytics.logEvent("share_image", parameters: purchaseParams)',
    );
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

    expect(snippet).toContain('NSMutableDictionary *purchaseParams = [@{');
    expect(snippet).toContain('@"image_name": @"hero.jpg"');
    expect(snippet).toContain('@"count": @(2)');
    expect(snippet).toContain('@"score": @(4.5)');
    expect(snippet).toContain('@"premium": @(0)');
    expect(snippet).toContain(
      '[FIRAnalytics logEventWithName:@"share_image" parameters:purchaseParams];',
    );
  });

  it('includes fallback warning comment when nested values are serialized', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'android-firebase-kotlin-sdk',
      example: {
        event: 'checkout',
        ecommerce: {
          currency: 'EUR',
          metadata: { payment_step: 2 },
          items: [{ sku: 'abc' }],
        },
      },
      schema: { properties: {} },
    });

    expect(snippet).toContain('WARNING');
    expect(snippet).toContain('serialized to JSON string');
    expect(snippet).toContain('param(FirebaseAnalytics.Param.CURRENCY, "EUR")');
    expect(snippet).toContain('param("metadata",');
  });

  it('uses firebase constants and item placeholders for purchase event', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'android-firebase-kotlin-sdk',
      example: {
        event: 'purchase',
        ecommerce: {
          transaction_id: 'T12345',
          affiliation: 'Google Store',
          currency: 'USD',
          value: 14.98,
          tax: 2.58,
          shipping: 5.34,
          coupon: 'SUMMER_FUN',
          items: [{ item_id: 'sku-1' }],
        },
      },
      schema: { properties: {} },
    });

    expect(snippet).toContain(
      'firebaseAnalytics.logEvent(FirebaseAnalytics.Event.PURCHASE)',
    );
    expect(snippet).toContain(
      'param(FirebaseAnalytics.Param.TRANSACTION_ID, "T12345")',
    );
    expect(snippet).toContain(
      'param(FirebaseAnalytics.Param.AFFILIATION, "Google Store")',
    );
    expect(snippet).toContain('param(FirebaseAnalytics.Param.CURRENCY, "USD")');
    expect(snippet).toContain('param(FirebaseAnalytics.Param.VALUE, 14.98)');
    expect(snippet).toContain('param(FirebaseAnalytics.Param.TAX, 2.58)');
    expect(snippet).toContain('param(FirebaseAnalytics.Param.SHIPPING, 5.34)');
    expect(snippet).toContain(
      'param(FirebaseAnalytics.Param.COUPON, "SUMMER_FUN")',
    );
    expect(snippet).toContain(
      'param(FirebaseAnalytics.Param.ITEMS, arrayOf(item1))',
    );
  });

  it('omits $schema and unwraps ecommerce primitives for firebase targets', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'ios-firebase-swift-sdk',
      example: {
        $schema: 'https://example.com/schemas/purchase-event.json',
        event: 'purchase',
        ecommerce: {
          transaction_id: 'T_12345',
          value: 72.05,
          currency: 'EUR',
        },
      },
      schema: { properties: {} },
    });

    expect(snippet).toContain('AnalyticsParameterTransactionID: "T_12345"');
    expect(snippet).toContain('AnalyticsParameterValue: 72.05');
    expect(snippet).toContain('AnalyticsParameterCurrency: "EUR"');
    expect(snippet).toContain(
      'Analytics.logEvent(AnalyticsEventPurchase, parameters: purchaseParams)',
    );
    expect(snippet).not.toContain('$schema');
    expect(snippet).not.toContain('ecommerce');
  });
});
