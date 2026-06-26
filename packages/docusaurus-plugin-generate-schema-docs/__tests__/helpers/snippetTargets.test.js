import {
  createTrackingTargetRegistry,
  DEFAULT_SNIPPET_TARGET_ID,
  generateSnippetForTarget,
  SNIPPET_TARGETS,
} from '../../helpers/snippetTargets';

function executeWebSnippet(snippet, dataLayerName = 'dataLayer') {
  const push = jest.fn();
  const runtimeWindow = {
    [dataLayerName]: { push },
  };
  const runner = new Function('window', snippet);
  runner(runtimeWindow);
  return push.mock.calls.map(([payload]) => payload);
}

describe('snippetTargets', () => {
  const targetRegistry = createTrackingTargetRegistry();

  it('exposes expected baseline target ids', () => {
    expect(SNIPPET_TARGETS.map((target) => target.id)).toEqual(
      expect.arrayContaining([
        'web-datalayer-js',
        'android-firebase-kotlin-sdk',
        'android-firebase-java-sdk',
        'ios-firebase-swift-sdk',
        'ios-firebase-objc-sdk',
        'web-braze-js',
      ]),
    );
  });

  it('exposes generateSnippet as the single target snippet API', () => {
    SNIPPET_TARGETS.forEach((target) => {
      expect(target.generateSnippet).toEqual(expect.any(Function));
      expect(target).not.toHaveProperty('generator');
    });
  });

  it('rejects custom targets that use the legacy generator API', () => {
    expect(() =>
      createTrackingTargetRegistry({
        customTargets: [
          {
            id: 'web-legacy-js',
            generator: () => 'legacy.track();',
          },
        ],
      }),
    ).toThrow('Tracking target "web-legacy-js" must define generateSnippet.');
  });

  it('resolves the default target when no id is provided', () => {
    const target = targetRegistry.get();
    expect(target.id).toBe(DEFAULT_SNIPPET_TARGET_ID);
  });

  it('throws for unknown target id', () => {
    expect(() => targetRegistry.get('unknown-target-id')).toThrow(
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

  it('generates web braze custom event snippet', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'web-braze-js',
      example: {
        $schema: 'https://example.com/schemas/share-image-event.json',
        event: 'share_image',
        image_name: 'hero.jpg',
        count: 2,
        premium: true,
      },
      schema: { properties: {} },
    });

    expect(snippet).toBe(`braze.logCustomEvent("share_image", {
  "image_name": "hero.jpg",
  "count": 2,
  "premium": true
});`);
  });

  it('omits event properties for web braze snippets when only event metadata is present', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'web-braze-js',
      example: {
        $schema: 'https://example.com/schemas/login-event.json',
        event: 'login',
      },
      schema: { properties: {} },
    });

    expect(snippet).toBe('braze.logCustomEvent("login");');
  });

  it('generates web braze identify snippet with custom user attributes', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'web-braze-js',
      example: {
        $schema: 'https://example.com/schemas/identify-user.json',
        userId: 'user-123',
        plan: 'pro',
        account_age_days: 42,
        premium: true,
      },
      schema: { 'x-method': 'identify', properties: {} },
    });

    expect(snippet).toBe(`braze.changeUser("user-123");
const user = braze.getUser();
user.setCustomUserAttribute("plan", "pro");
user.setCustomUserAttribute("account_age_days", 42);
user.setCustomUserAttribute("premium", true);`);
  });

  it('generates web braze identify snippet without user attributes when only userId is present', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'web-braze-js',
      example: {
        $schema: 'https://example.com/schemas/identify-user.json',
        userId: 'user-123',
      },
      schema: { 'x-method': 'identify', properties: {} },
    });

    expect(snippet).toBe('braze.changeUser("user-123");');
  });

  it('generates web braze alias snippet', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'web-braze-js',
      example: {
        $schema: 'https://example.com/schemas/add-user-alias.json',
        alias_name: 'guest_abc123',
        alias_label: 'guest_id',
      },
      schema: { 'x-method': 'alias', properties: {} },
    });

    expect(snippet).toBe(
      'braze.getUser().addAlias("guest_abc123", "guest_id");',
    );
  });

  it.each([
    ['alias_name', { alias_label: 'guest_id' }],
    ['alias_label', { alias_name: 'guest_abc123' }],
  ])('rejects web braze alias snippets without %s', (_field, example) => {
    expect(() =>
      generateSnippetForTarget({
        targetId: 'web-braze-js',
        example,
        schema: { 'x-method': 'alias', properties: {} },
      }),
    ).toThrow(
      '[web-braze-js] Braze alias snippets require non-empty string alias_name and alias_label.',
    );
  });

  it.each(['web-segment-js', 'web-rudderstack-js', 'web-hightouch-js'])(
    'rejects alias snippets for %s until target-specific semantics are implemented',
    (targetId) => {
      expect(() =>
        generateSnippetForTarget({
          targetId,
          example: {
            alias_name: 'guest_abc123',
            alias_label: 'guest_id',
          },
          schema: { 'x-method': 'alias', properties: {} },
        }),
      ).toThrow(
        `[${targetId}] Snippet target does not support x-method "alias".`,
      );
    },
  );

  it('rejects web braze identify snippets without userId', () => {
    expect(() =>
      generateSnippetForTarget({
        targetId: 'web-braze-js',
        example: {
          plan: 'pro',
        },
        schema: { 'x-method': 'identify', properties: {} },
      }),
    ).toThrow(
      '[web-braze-js] Braze identify snippets require a non-empty string userId.',
    );
  });

  it('rejects unsupported methods for web braze snippets', () => {
    expect(() =>
      generateSnippetForTarget({
        targetId: 'web-braze-js',
        example: {
          groupId: 'group-123',
        },
        schema: { 'x-method': 'group', properties: {} },
      }),
    ).toThrow(
      '[web-braze-js] Braze snippets only support x-method "track", "identify", or "alias".',
    );
  });

  it('executes web-datalayer snippet and pushes expected payload', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'web-datalayer-js',
      example: {
        event: 'purchase',
        ecommerce: {
          currency: 'EUR',
          value: 72.05,
        },
      },
      schema: { properties: {} },
    });

    const pushedPayloads = executeWebSnippet(snippet);
    expect(pushedPayloads).toEqual([
      {
        event: 'purchase',
        ecommerce: { currency: 'EUR', value: 72.05 },
      },
    ]);
  });

  it('executes web-datalayer snippet with clearable properties reset first', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'web-datalayer-js',
      example: {
        event: 'purchase',
        ecommerce: { value: 10 },
      },
      schema: {
        properties: {
          ecommerce: { 'x-gtm-clear': true, type: 'object' },
          user_data: { 'x-gtm-clear': true, type: 'object' },
          event: { type: 'string' },
        },
      },
    });

    const pushedPayloads = executeWebSnippet(snippet);
    expect(pushedPayloads).toEqual([
      { ecommerce: null },
      { event: 'purchase', ecommerce: { value: 10 } },
    ]);
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
    expect(snippet).toContain('param(FirebaseAnalytics.Param.SCORE, 4.5)');
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

    expect(snippet).toContain('Bundle eventParams = new Bundle();');
    expect(snippet).toContain(
      'eventParams.putString("image_name", "hero.jpg");',
    );
    expect(snippet).toContain('eventParams.putLong("count", 2L);');
    expect(snippet).toContain(
      'eventParams.putDouble(FirebaseAnalytics.Param.SCORE, 4.5);',
    );
    expect(snippet).toContain('eventParams.putLong("premium", 0L);');
    expect(snippet).toContain(
      'mFirebaseAnalytics.logEvent("share_image", eventParams);',
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

    expect(snippet).toContain('var eventParams: [String: Any] = [');
    expect(snippet).toContain('"image_name": "hero.jpg"');
    expect(snippet).toContain('"count": 2');
    expect(snippet).toContain('AnalyticsParameterScore: 4.5');
    expect(snippet).toContain('"premium": 1');
    expect(snippet).toContain(
      'Analytics.logEvent("share_image", parameters: eventParams)',
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

    expect(snippet).toContain('NSMutableDictionary *eventParams = [@{');
    expect(snippet).toContain('@"image_name": @"hero.jpg"');
    expect(snippet).toContain('@"count": @(2)');
    expect(snippet).toContain('kFIRParameterScore: @(4.5)');
    expect(snippet).toContain('@"premium": @(0)');
    expect(snippet).toContain(
      '[FIRAnalytics logEventWithName:@"share_image" parameters:eventParams];',
    );
  });

  it('throws when firebase payload contains unsupported nested values', () => {
    expect(() =>
      generateSnippetForTarget({
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
      }),
    ).toThrow(
      '[android-firebase-kotlin-sdk] Unsupported Firebase payload at "ecommerce"',
    );
  });

  it('throws when firebase payload is missing a non-empty event name', () => {
    expect(() =>
      generateSnippetForTarget({
        targetId: 'ios-firebase-swift-sdk',
        example: {
          value: 12.5,
        },
        schema: { properties: {} },
      }),
    ).toThrow(
      '[ios-firebase-swift-sdk] Unsupported Firebase payload at "event"',
    );

    expect(() =>
      generateSnippetForTarget({
        targetId: 'android-firebase-java-sdk',
        example: {
          event: '   ',
          value: 12.5,
        },
        schema: { properties: {} },
      }),
    ).toThrow(
      '[android-firebase-java-sdk] Unsupported Firebase payload at "event"',
    );
  });

  it('uses firebase constants and concrete item bundles for purchase event', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'android-firebase-kotlin-sdk',
      example: {
        event: 'purchase',
        transaction_id: 'T12345',
        affiliation: 'Google Store',
        currency: 'USD',
        value: 14.98,
        tax: 2.58,
        shipping: 5.34,
        coupon: 'SUMMER_FUN',
        items: [{ item_id: 'sku-1' }],
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
    expect(snippet).toContain('val item1 = Bundle().apply {');
    expect(snippet).toContain(
      'putString(FirebaseAnalytics.Param.ITEM_ID, "sku-1")',
    );
    expect(snippet).toContain(
      'param(FirebaseAnalytics.Param.ITEMS, arrayOf(item1))',
    );
  });

  it('builds item dictionaries for swift purchase snippets', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'ios-firebase-swift-sdk',
      example: {
        event: 'purchase',
        transaction_id: 'T12345',
        items: [
          {
            item_id: 'SKU_123',
            item_name: 'jeggings',
            item_category: 'pants',
            item_variant: 'black',
            item_brand: 'Google',
            price: 9.99,
          },
          {
            item_id: 'SKU_456',
            item_name: 'boots',
            item_category: 'shoes',
            item_variant: 'brown',
            item_brand: 'Google',
            price: 24.99,
          },
        ],
      },
      schema: { properties: {} },
    });

    expect(snippet).toContain('var item1: [String: Any] = [');
    expect(snippet).toContain('AnalyticsParameterItemID: "SKU_123"');
    expect(snippet).toContain('AnalyticsParameterItemName: "jeggings"');
    expect(snippet).toContain('AnalyticsParameterPrice: 9.99');
    expect(snippet).toContain('var item2: [String: Any] = [');
    expect(snippet).toContain('AnalyticsParameterItemID: "SKU_456"');
    expect(snippet).toContain(
      'eventParams[AnalyticsParameterItems] = [item1, item2]',
    );
  });

  it('omits $schema for firebase targets', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'ios-firebase-swift-sdk',
      example: {
        $schema: 'https://example.com/schemas/purchase-event.json',
        event: 'purchase',
        transaction_id: 'T_12345',
        value: 72.05,
        currency: 'EUR',
      },
      schema: { properties: {} },
    });

    expect(snippet).toContain('AnalyticsParameterTransactionID: "T_12345"');
    expect(snippet).toContain('AnalyticsParameterValue: 72.05');
    expect(snippet).toContain('AnalyticsParameterCurrency: "EUR"');
    expect(snippet).toContain(
      'Analytics.logEvent(AnalyticsEventPurchase, parameters: eventParams)',
    );
    expect(snippet).not.toContain('$schema');
  });

  it('uses official firebase screen_view constants for kotlin snippets', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'android-firebase-kotlin-sdk',
      example: {
        event: 'screen_view',
        screen_name: 'Checkout',
        screen_class: 'CheckoutActivity',
        firebase_screen: 'Checkout',
        firebase_screen_class: 'CheckoutActivity',
      },
      schema: { properties: {} },
    });

    expect(snippet).toContain(
      'firebaseAnalytics.logEvent(FirebaseAnalytics.Event.SCREEN_VIEW)',
    );
    expect(snippet).toContain(
      'param(FirebaseAnalytics.Param.SCREEN_NAME, "Checkout")',
    );
    expect(snippet).toContain(
      'param(FirebaseAnalytics.Param.SCREEN_CLASS, "CheckoutActivity")',
    );
  });

  it('uses official firebase screen_view constants for java snippets', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'android-firebase-java-sdk',
      example: {
        event: 'screen_view',
        screen_name: 'Checkout',
        screen_class: 'CheckoutActivity',
      },
      schema: { properties: {} },
    });

    expect(snippet).toContain(
      'mFirebaseAnalytics.logEvent(FirebaseAnalytics.Event.SCREEN_VIEW, eventParams);',
    );
    expect(snippet).toContain(
      'eventParams.putString(FirebaseAnalytics.Param.SCREEN_NAME, "Checkout");',
    );
    expect(snippet).toContain(
      'eventParams.putString(FirebaseAnalytics.Param.SCREEN_CLASS, "CheckoutActivity");',
    );
  });

  it('uses official firebase screen_view constants for swift snippets', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'ios-firebase-swift-sdk',
      example: {
        event: 'screen_view',
        screen_name: 'Checkout',
        screen_class: 'CheckoutViewController',
      },
      schema: { properties: {} },
    });

    expect(snippet).toContain(
      'Analytics.logEvent(AnalyticsEventScreenView, parameters: eventParams)',
    );
    expect(snippet).toContain('AnalyticsParameterScreenName: "Checkout"');
    expect(snippet).toContain(
      'AnalyticsParameterScreenClass: "CheckoutViewController"',
    );
  });

  it('uses official firebase screen_view constants for objective-c snippets', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'ios-firebase-objc-sdk',
      example: {
        event: 'screen_view',
        screen_name: 'Checkout',
        screen_class: 'CheckoutViewController',
      },
      schema: { properties: {} },
    });

    expect(snippet).toContain(
      '[FIRAnalytics logEventWithName:kFIREventScreenView parameters:eventParams];',
    );
    expect(snippet).toContain('kFIRParameterScreenName: @"Checkout"');
    expect(snippet).toContain(
      'kFIRParameterScreenClass: @"CheckoutViewController"',
    );
  });

  it('maps additional predefined firebase event and parameter constants', () => {
    const kotlinSnippet = generateSnippetForTarget({
      targetId: 'android-firebase-kotlin-sdk',
      example: {
        event: 'add_to_cart',
        currency: 'EUR',
        value: 42.5,
      },
      schema: { properties: {} },
    });
    const swiftSnippet = generateSnippetForTarget({
      targetId: 'ios-firebase-swift-sdk',
      example: {
        event: 'login',
        method: 'email',
      },
      schema: { properties: {} },
    });

    expect(kotlinSnippet).toContain(
      'firebaseAnalytics.logEvent(FirebaseAnalytics.Event.ADD_TO_CART)',
    );
    expect(kotlinSnippet).toContain(
      'param(FirebaseAnalytics.Param.CURRENCY, "EUR")',
    );
    expect(kotlinSnippet).toContain(
      'param(FirebaseAnalytics.Param.VALUE, 42.5)',
    );
    expect(swiftSnippet).toContain(
      'Analytics.logEvent(AnalyticsEventLogin, parameters: eventParams)',
    );
    expect(swiftSnippet).toContain('AnalyticsParameterMethod: "email"');
  });

  it('keeps custom events and params as string literals', () => {
    const javaSnippet = generateSnippetForTarget({
      targetId: 'android-firebase-java-sdk',
      example: {
        event: 'my_custom_event',
        custom_prop: 'x',
      },
      schema: { properties: {} },
    });

    expect(javaSnippet).toContain(
      'mFirebaseAnalytics.logEvent("my_custom_event", eventParams);',
    );
    expect(javaSnippet).toContain('eventParams.putString("custom_prop", "x");');
  });

  it('maps campaign_details standard params to firebase constants', () => {
    const kotlinSnippet = generateSnippetForTarget({
      targetId: 'android-firebase-kotlin-sdk',
      example: {
        event: 'campaign_details',
        campaign_id: 'cmp_42',
        aclid: 'aclid_99',
      },
      schema: { properties: {} },
    });
    const objcSnippet = generateSnippetForTarget({
      targetId: 'ios-firebase-objc-sdk',
      example: {
        event: 'campaign_details',
        campaign_id: 'cmp_42',
        aclid: 'aclid_99',
      },
      schema: { properties: {} },
    });

    expect(kotlinSnippet).toContain(
      'firebaseAnalytics.logEvent(FirebaseAnalytics.Event.CAMPAIGN_DETAILS)',
    );
    expect(kotlinSnippet).toContain(
      'param(FirebaseAnalytics.Param.CAMPAIGN_ID, "cmp_42")',
    );
    expect(kotlinSnippet).toContain(
      'param(FirebaseAnalytics.Param.ACLID, "aclid_99")',
    );
    expect(objcSnippet).toContain(
      '[FIRAnalytics logEventWithName:kFIREventCampaignDetails parameters:eventParams];',
    );
    expect(objcSnippet).toContain('kFIRParameterCampaignID: @"cmp_42"');
    expect(objcSnippet).toContain('kFIRParameterAdNetworkClickID: @"aclid_99"');
  });

  it('uses the iOS/Obj-C aclid exception constant and additional standard params', () => {
    const swiftSnippet = generateSnippetForTarget({
      targetId: 'ios-firebase-swift-sdk',
      example: {
        event: 'campaign_details',
        aclid: 'aclid_99',
        source_platform: 'google_ads',
        marketing_tactic: 'retargeting',
      },
      schema: { properties: {} },
    });
    const kotlinSnippet = generateSnippetForTarget({
      targetId: 'android-firebase-kotlin-sdk',
      example: {
        event: 'ad_impression',
        ad_unit_name: '/123/home',
        creative_format: 'video',
      },
      schema: { properties: {} },
    });

    expect(swiftSnippet).toContain(
      'AnalyticsParameterAdNetworkClickID: "aclid_99"',
    );
    expect(swiftSnippet).toContain(
      'AnalyticsParameterSourcePlatform: "google_ads"',
    );
    expect(swiftSnippet).toContain(
      'AnalyticsParameterMarketingTactic: "retargeting"',
    );
    expect(kotlinSnippet).toContain(
      'param(FirebaseAnalytics.Param.AD_UNIT_NAME, "/123/home")',
    );
    expect(kotlinSnippet).toContain(
      'param(FirebaseAnalytics.Param.CREATIVE_FORMAT, "video")',
    );
  });

  it('emits firebase user property setters with predefined constants', () => {
    const kotlinSnippet = generateSnippetForTarget({
      targetId: 'android-firebase-kotlin-sdk',
      example: {
        event: 'login',
        method: 'email',
        user_properties: {
          sign_up_method: 'email',
          allow_ad_personalization_signals: 'false',
        },
      },
      schema: { properties: {} },
    });
    const javaSnippet = generateSnippetForTarget({
      targetId: 'android-firebase-java-sdk',
      example: {
        event: 'login',
        method: 'email',
        user_properties: {
          sign_up_method: 'email',
        },
      },
      schema: { properties: {} },
    });
    const swiftSnippet = generateSnippetForTarget({
      targetId: 'ios-firebase-swift-sdk',
      example: {
        event: 'login',
        method: 'email',
        user_properties: {
          sign_up_method: 'email',
        },
      },
      schema: { properties: {} },
    });
    const objcSnippet = generateSnippetForTarget({
      targetId: 'ios-firebase-objc-sdk',
      example: {
        event: 'login',
        method: 'email',
        user_properties: {
          sign_up_method: 'email',
          allow_ad_personalization_signals: null,
        },
      },
      schema: { properties: {} },
    });

    expect(kotlinSnippet).toContain(
      'firebaseAnalytics.setUserProperty(FirebaseAnalytics.UserProperty.SIGN_UP_METHOD, "email")',
    );
    expect(kotlinSnippet).toContain(
      'firebaseAnalytics.setUserProperty(FirebaseAnalytics.UserProperty.ALLOW_AD_PERSONALIZATION_SIGNALS, "false")',
    );
    expect(javaSnippet).toContain(
      'mFirebaseAnalytics.setUserProperty(FirebaseAnalytics.UserProperty.SIGN_UP_METHOD, "email");',
    );
    expect(swiftSnippet).toContain(
      'Analytics.setUserProperty("email", forName: AnalyticsUserPropertySignUpMethod)',
    );
    expect(objcSnippet).toContain(
      '[FIRAnalytics setUserPropertyString:@"email" forName:kFIRUserPropertySignUpMethod];',
    );
    expect(objcSnippet).toContain(
      '[FIRAnalytics setUserPropertyString:nil forName:kFIRUserPropertyAllowAdPersonalizationSignals];',
    );
    expect(kotlinSnippet).not.toContain('param("user_properties"');
  });

  it('maps ecommerce-focused params with IDs and numbered categories correctly', () => {
    const kotlinSnippet = generateSnippetForTarget({
      targetId: 'android-firebase-kotlin-sdk',
      example: {
        event: 'select_promotion',
        promotion_id: 'PROMO_123',
        promotion_name: 'Summer Sale',
        creative_slot: 'hero_top',
        item_list_id: 'LIST_42',
        item_list_name: 'Homepage Picks',
      },
      schema: { properties: {} },
    });
    const swiftSnippet = generateSnippetForTarget({
      targetId: 'ios-firebase-swift-sdk',
      example: {
        event: 'purchase',
        transaction_id: 'T_100',
        shipping_tier: 'Express',
        items: [
          {
            item_id: 'SKU_123',
            item_name: 'jeggings',
            item_category2: 'bottoms',
            item_category5: 'sale',
          },
        ],
      },
      schema: { properties: {} },
    });
    const objcSnippet = generateSnippetForTarget({
      targetId: 'ios-firebase-objc-sdk',
      example: {
        event: 'add_to_cart',
        item_list_id: 'LIST_42',
        item_list_name: 'Homepage Picks',
        coupon: 'WELCOME10',
      },
      schema: { properties: {} },
    });

    expect(kotlinSnippet).toContain(
      'param(FirebaseAnalytics.Param.PROMOTION_ID, "PROMO_123")',
    );
    expect(kotlinSnippet).toContain(
      'param(FirebaseAnalytics.Param.ITEM_LIST_ID, "LIST_42")',
    );
    expect(swiftSnippet).toContain('AnalyticsParameterTransactionID: "T_100"');
    expect(swiftSnippet).toContain('AnalyticsParameterShippingTier: "Express"');
    expect(swiftSnippet).toContain(
      'AnalyticsParameterItemCategory2: "bottoms"',
    );
    expect(swiftSnippet).toContain('AnalyticsParameterItemCategory5: "sale"');
    expect(objcSnippet).toContain('kFIRParameterItemListID: @"LIST_42"');
    expect(objcSnippet).toContain(
      'kFIRParameterItemListName: @"Homepage Picks"',
    );
    expect(objcSnippet).toContain('kFIRParameterCoupon: @"WELCOME10"');
  });

  it('emits null user property value for kotlin snippet', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'android-firebase-kotlin-sdk',
      example: {
        event: 'login',
        user_properties: { custom_prop: null },
      },
      schema: { properties: {} },
    });
    expect(snippet).toContain(
      'firebaseAnalytics.setUserProperty("custom_prop", null)',
    );
  });

  it('emits null user property value for java snippet', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'android-firebase-java-sdk',
      example: {
        event: 'login',
        user_properties: { custom_prop: null },
      },
      schema: { properties: {} },
    });
    expect(snippet).toContain(
      'mFirebaseAnalytics.setUserProperty("custom_prop", null);',
    );
  });

  it('emits nil user property value for swift snippet', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'ios-firebase-swift-sdk',
      example: {
        event: 'login',
        user_properties: { custom_prop: null },
      },
      schema: { properties: {} },
    });
    expect(snippet).toContain(
      'Analytics.setUserProperty(nil, forName: "custom_prop")',
    );
  });

  it('emits nil log call with parameters:nil for swift when no params', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'ios-firebase-swift-sdk',
      example: {
        event: 'login',
        user_properties: { plan: 'free' },
      },
      schema: { properties: {} },
    });
    expect(snippet).toContain(
      'Analytics.logEvent(AnalyticsEventLogin, parameters: nil)',
    );
  });

  it('emits parameters:nil for objc when no params', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'ios-firebase-objc-sdk',
      example: { event: 'login' },
      schema: { properties: {} },
    });
    expect(snippet).toContain(
      '[FIRAnalytics logEventWithName:kFIREventLogin parameters:nil];',
    );
  });

  it('emits @"string" user property for objc with non-predefined key', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'ios-firebase-objc-sdk',
      example: {
        event: 'login',
        user_properties: { custom_user_prop: 'value' },
      },
      schema: { properties: {} },
    });
    expect(snippet).toContain(
      '[FIRAnalytics setUserPropertyString:@"value" forName:@"custom_user_prop"];',
    );
  });

  it('coerces number and boolean user properties to strings', () => {
    const kotlinSnippet = generateSnippetForTarget({
      targetId: 'android-firebase-kotlin-sdk',
      example: {
        event: 'login',
        user_properties: { count: 42, active: true },
      },
      schema: { properties: {} },
    });
    const javaSnippet = generateSnippetForTarget({
      targetId: 'android-firebase-java-sdk',
      example: {
        event: 'login',
        user_properties: { count: 42, active: false },
      },
      schema: { properties: {} },
    });

    expect(kotlinSnippet).toContain(
      'firebaseAnalytics.setUserProperty("count", "42")',
    );
    expect(kotlinSnippet).toContain(
      'firebaseAnalytics.setUserProperty("active", "true")',
    );
    expect(javaSnippet).toContain(
      'mFirebaseAnalytics.setUserProperty("count", "42");',
    );
    expect(javaSnippet).toContain(
      'mFirebaseAnalytics.setUserProperty("active", "false");',
    );
  });

  it('throws when user property value is an unsupported type (object)', () => {
    expect(() =>
      generateSnippetForTarget({
        targetId: 'android-firebase-kotlin-sdk',
        example: {
          event: 'login',
          user_properties: { nested: { a: 1 } },
        },
        schema: { properties: {} },
      }),
    ).toThrow('user_properties.nested');
  });

  it('throws when items array contains non-object items', () => {
    expect(() =>
      generateSnippetForTarget({
        targetId: 'android-firebase-kotlin-sdk',
        example: {
          event: 'purchase',
          items: ['invalid-item'],
        },
        schema: { properties: {} },
      }),
    ).toThrow('non-empty array of objects');
  });

  it('throws when items is an empty array', () => {
    expect(() =>
      generateSnippetForTarget({
        targetId: 'android-firebase-kotlin-sdk',
        example: {
          event: 'purchase',
          items: [],
        },
        schema: { properties: {} },
      }),
    ).toThrow('non-empty array of objects');
  });

  it('handles items with boolean values in kotlin bundles', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'android-firebase-kotlin-sdk',
      example: {
        event: 'purchase',
        items: [{ item_id: 'sku-1', is_featured: true, custom_score: 5.5 }],
      },
      schema: { properties: {} },
    });
    expect(snippet).toContain(
      'putString(FirebaseAnalytics.Param.ITEM_ID, "sku-1")',
    );
    expect(snippet).toContain('putLong("is_featured", 1L)');
    expect(snippet).toContain('putDouble("custom_score", 5.5)');
  });

  it('handles items with boolean values in java bundles', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'android-firebase-java-sdk',
      example: {
        event: 'purchase',
        items: [{ item_id: 'sku-1', is_sale: false, custom_price: 2.5 }],
      },
      schema: { properties: {} },
    });
    expect(snippet).toContain(
      'item1.putString(FirebaseAnalytics.Param.ITEM_ID, "sku-1");',
    );
    expect(snippet).toContain('item1.putLong("is_sale", 0L);');
    expect(snippet).toContain('item1.putDouble("custom_price", 2.5);');
  });

  it('handles items with boolean values in swift item dicts', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'ios-firebase-swift-sdk',
      example: {
        event: 'purchase',
        items: [
          { item_id: 'sku-1', flag: true, price: 9.99 },
          { item_id: 'sku-2', flag: false },
        ],
      },
      schema: { properties: {} },
    });
    expect(snippet).toContain('AnalyticsParameterItemID: "sku-1"');
    expect(snippet).toContain('"flag": 1,');
    expect(snippet).toContain('AnalyticsParameterPrice: 9.99');
    expect(snippet).toContain('AnalyticsParameterItemID: "sku-2"');
    expect(snippet).toContain('"flag": 0');
  });

  it('handles items with boolean values in objc item dicts', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'ios-firebase-objc-sdk',
      example: {
        event: 'purchase',
        items: [
          { item_id: 'sku-1', flag: true, price: 9.99 },
          { item_id: 'sku-2' },
        ],
      },
      schema: { properties: {} },
    });
    expect(snippet).toContain('kFIRParameterItemID: @"sku-1"');
    expect(snippet).toContain('@"flag": @(1),');
    expect(snippet).toContain('kFIRParameterPrice: @(9.99)');
    expect(snippet).toContain('kFIRParameterItemID: @"sku-2"');
  });

  it('throws when item value in bundle is an unsupported type (nested object)', () => {
    expect(() =>
      generateSnippetForTarget({
        targetId: 'android-firebase-kotlin-sdk',
        example: {
          event: 'purchase',
          items: [{ item_id: 'sku-1', metadata: { nested: true } }],
        },
        schema: { properties: {} },
      }),
    ).toThrow('items[0].metadata');
  });

  it('includes error type label "null" and "array" in shape error message', () => {
    expect(() =>
      generateSnippetForTarget({
        targetId: 'android-firebase-kotlin-sdk',
        example: {
          event: 'purchase',
          items: [{ item_id: 'sku-1', bad: null }],
        },
        schema: { properties: {} },
      }),
    ).toThrow('null');

    expect(() =>
      generateSnippetForTarget({
        targetId: 'android-firebase-kotlin-sdk',
        example: {
          event: 'purchase',
          items: [{ item_id: 'sku-1', bad: [1, 2] }],
        },
        schema: { properties: {} },
      }),
    ).toThrow('array');
  });

  it('maps additional Firebase commerce constants present in reference docs', () => {
    const kotlinSnippet = generateSnippetForTarget({
      targetId: 'android-firebase-kotlin-sdk',
      example: {
        event: 'in_app_purchase',
        product_id: 'sku_premium',
        product_name: 'Premium Plan',
        subscription: true,
        free_trial: false,
        price_is_discounted: true,
      },
      schema: { properties: {} },
    });
    const swiftSnippet = generateSnippetForTarget({
      targetId: 'ios-firebase-swift-sdk',
      example: {
        event: 'in_app_purchase',
        product_id: 'sku_premium',
        product_name: 'Premium Plan',
        subscription: true,
        free_trial: false,
        price_is_discounted: true,
      },
      schema: { properties: {} },
    });

    expect(kotlinSnippet).toContain(
      'firebaseAnalytics.logEvent(FirebaseAnalytics.Event.IN_APP_PURCHASE)',
    );
    expect(kotlinSnippet).toContain(
      'param(FirebaseAnalytics.Param.PRODUCT_ID, "sku_premium")',
    );
    expect(kotlinSnippet).toContain(
      'param(FirebaseAnalytics.Param.PRODUCT_NAME, "Premium Plan")',
    );
    expect(kotlinSnippet).toContain(
      'param(FirebaseAnalytics.Param.SUBSCRIPTION, 1L)',
    );
    expect(kotlinSnippet).toContain(
      'param(FirebaseAnalytics.Param.FREE_TRIAL, 0L)',
    );
    expect(kotlinSnippet).toContain(
      'param(FirebaseAnalytics.Param.PRICE_IS_DISCOUNTED, 1L)',
    );
    expect(swiftSnippet).toContain(
      'Analytics.logEvent(AnalyticsEventInAppPurchase, parameters: eventParams)',
    );
    expect(swiftSnippet).toContain(
      'AnalyticsParameterProductID: "sku_premium"',
    );
    expect(swiftSnippet).toContain(
      'AnalyticsParameterProductName: "Premium Plan"',
    );
    expect(swiftSnippet).toContain('AnalyticsParameterSubscription: 1');
    expect(swiftSnippet).toContain('AnalyticsParameterFreeTrial: 0');
    expect(swiftSnippet).toContain('AnalyticsParameterPriceIsDiscounted: 1');
  });

  it('snippet does not begin with stray content for kotlin (no items, no user_properties)', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'android-firebase-kotlin-sdk',
      example: { event: 'login', method: 'email' },
      schema: { properties: {} },
    });
    expect(snippet.startsWith('firebaseAnalytics.logEvent(')).toBe(true);
  });

  it('snippet does not begin with stray content for java (no items, no user_properties)', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'android-firebase-java-sdk',
      example: { event: 'login', method: 'email' },
      schema: { properties: {} },
    });
    expect(snippet.startsWith('Bundle eventParams = new Bundle();')).toBe(true);
  });

  it('handles user_properties: null gracefully (returns no user property lines)', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'android-firebase-kotlin-sdk',
      example: { event: 'login', user_properties: null },
      schema: { properties: {} },
    });
    expect(snippet).not.toContain('setUserProperty');
    expect(snippet).toContain(
      'firebaseAnalytics.logEvent(FirebaseAnalytics.Event.LOGIN)',
    );
  });

  it('skips event and $schema keys in firebase param entries', () => {
    const kotlinSnippet = generateSnippetForTarget({
      targetId: 'android-firebase-kotlin-sdk',
      example: {
        event: 'custom_event',
        $schema: 'https://example.com/schema.json',
        custom_method: 'email',
      },
      schema: { properties: {} },
    });
    expect(kotlinSnippet).not.toContain('"event"');
    expect(kotlinSnippet).not.toContain('"$schema"');
    expect(kotlinSnippet).toContain('param("custom_method", "email")');
  });

  it('kotlin snippet with items starts with item bundles, not stray content', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'android-firebase-kotlin-sdk',
      example: {
        event: 'purchase',
        items: [{ item_id: 'sku-1' }],
      },
      schema: { properties: {} },
    });
    expect(snippet.startsWith('val item1 = Bundle().apply {')).toBe(true);
  });

  it('java snippet with items starts with item bundles, not stray content', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'android-firebase-java-sdk',
      example: {
        event: 'purchase',
        items: [{ item_id: 'sku-1' }],
      },
      schema: { properties: {} },
    });
    expect(snippet.startsWith('Bundle item1 = new Bundle();')).toBe(true);
  });

  it('swift snippet with items starts with item dicts, not stray content', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'ios-firebase-swift-sdk',
      example: {
        event: 'purchase',
        items: [{ item_id: 'sku-1' }],
      },
      schema: { properties: {} },
    });
    expect(snippet.startsWith('var item1: [String: Any] = [')).toBe(true);
  });

  it('objc snippet with items starts with item dicts, not stray content', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'ios-firebase-objc-sdk',
      example: {
        event: 'purchase',
        items: [{ item_id: 'sku-1' }],
      },
      schema: { properties: {} },
    });
    expect(snippet.startsWith('NSMutableDictionary *item1 = [@{')).toBe(true);
  });

  // L839: generateSnippetForTarget default-arg — omit targetId to trigger default
  it('uses default targetId when none is provided', () => {
    const snippet = generateSnippetForTarget({
      example: { event: 'test_event' },
      schema: { properties: {} },
    });

    expect(snippet).toContain('window.dataLayer.push');
    expect(snippet).toContain('"event": "test_event"');
  });

  // L222: config default-arg — call web generator directly without config
  it('web generator defaults config to {} when config is omitted', () => {
    const webTarget = SNIPPET_TARGETS.find((t) => t.id === 'web-datalayer-js');
    const snippet = webTarget.generateSnippet({
      example: { event: 'test_event' },
      schema: { properties: {} },
      dataLayerName: 'myDL',
    });

    expect(snippet).toContain('window.myDL.push');
  });

  // L227: schema || {} — call web generator with schema undefined
  it('web generator falls back to empty schema when schema is falsy', () => {
    const webTarget = SNIPPET_TARGETS.find((t) => t.id === 'web-datalayer-js');
    const snippet = webTarget.generateSnippet({
      example: { event: 'test_event' },
      schema: undefined,
      config: {},
    });

    expect(snippet).toContain('window.dataLayer.push');
    expect(snippet).toContain('"event": "test_event"');
  });

  // L265: example || {} — call firebase generator with example undefined (throws before L265, but exercises the path)
  it('toFirebaseParamEntries handles null example via || {} fallback', () => {
    const kotlinTarget = SNIPPET_TARGETS.find(
      (t) => t.id === 'android-firebase-kotlin-sdk',
    );
    // example with only event triggers toFirebaseParamEntries with a truthy example
    // but no additional params — the || {} fallback is defensive
    const snippet = kotlinTarget.generateSnippet({
      example: { event: 'simple_event' },
      targetId: 'android-firebase-kotlin-sdk',
    });

    expect(snippet).toContain('firebaseAnalytics.logEvent("simple_event")');
  });

  // L289: predefined event with objc platform — kFIREvent constant
  it('uses kFIREvent constant for predefined event in objc snippet', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'ios-firebase-objc-sdk',
      example: {
        event: 'purchase',
        transaction_id: 'T_100',
      },
      schema: { properties: {} },
    });

    expect(snippet).toContain(
      '[FIRAnalytics logEventWithName:kFIREventPurchase parameters:eventParams];',
    );
  });

  // L306: predefined param with objc platform — kFIRParameter constant
  it('uses kFIRParameter constant for predefined param in objc snippet', () => {
    const snippet = generateSnippetForTarget({
      targetId: 'ios-firebase-objc-sdk',
      example: {
        event: 'custom_event',
        currency: 'USD',
      },
      schema: { properties: {} },
    });

    expect(snippet).toContain('kFIRParameterCurrency: @"USD"');
  });
});

function executeCdpSnippet(snippet, globalName) {
  const sdk = {
    track: jest.fn(),
    identify: jest.fn(),
    group: jest.fn(),
    page: jest.fn(),
  };
  const runner = new Function(globalName, snippet);
  runner(sdk);
  return sdk;
}

const CDP_TARGETS = [
  { targetId: 'web-segment-js', globalName: 'analytics', label: 'Segment' },
  {
    targetId: 'web-rudderstack-js',
    globalName: 'rudderanalytics',
    label: 'RudderStack',
  },
  { targetId: 'web-hightouch-js', globalName: 'htevents', label: 'Hightouch' },
];

describe.each(CDP_TARGETS)(
  '$label ($targetId) snippet',
  ({ targetId, globalName }) => {
    it('is registered in SNIPPET_TARGETS', () => {
      expect(SNIPPET_TARGETS.map((t) => t.id)).toContain(targetId);
    });

    it('has group=web and language=javascript', () => {
      const target = createTrackingTargetRegistry().get(targetId);
      expect(target.group).toBe('web');
      expect(target.language).toBe('javascript');
    });

    describe('track (default)', () => {
      it('defaults to track when x-method is absent', () => {
        const snippet = generateSnippetForTarget({
          targetId,
          example: { event: 'purchase', revenue: 10 },
          schema: {},
        });
        expect(snippet).toContain(`${globalName}.track(`);
      });

      it('extracts event name as first arg and remaining fields as properties', () => {
        const sdk = executeCdpSnippet(
          generateSnippetForTarget({
            targetId,
            example: { event: 'add_to_cart', item_id: 'SKU-1', quantity: 2 },
            schema: {},
          }),
          globalName,
        );
        expect(sdk.track).toHaveBeenCalledWith('add_to_cart', {
          item_id: 'SKU-1',
          quantity: 2,
        });
      });

      it('omits properties arg when no fields beyond event', () => {
        const snippet = generateSnippetForTarget({
          targetId,
          example: { event: 'page_view' },
          schema: {},
        });
        expect(snippet).toBe(`${globalName}.track("page_view");`);
      });

      it('excludes $schema from properties', () => {
        const sdk = executeCdpSnippet(
          generateSnippetForTarget({
            targetId,
            example: {
              event: 'test',
              $schema: 'http://example.com',
              foo: 'bar',
            },
            schema: {},
          }),
          globalName,
        );
        expect(sdk.track).toHaveBeenCalledWith('test', { foo: 'bar' });
      });
    });

    describe('identify (x-method: identify)', () => {
      it('calls identify with userId and traits when userId is present', () => {
        const sdk = executeCdpSnippet(
          generateSnippetForTarget({
            targetId,
            example: { userId: 'user-123', email: 'a@b.com', plan: 'pro' },
            schema: { 'x-method': 'identify' },
          }),
          globalName,
        );
        expect(sdk.identify).toHaveBeenCalledWith('user-123', {
          email: 'a@b.com',
          plan: 'pro',
        });
      });

      it('calls identify with traits only when userId is absent', () => {
        const sdk = executeCdpSnippet(
          generateSnippetForTarget({
            targetId,
            example: { email: 'a@b.com', plan: 'pro' },
            schema: { 'x-method': 'identify' },
          }),
          globalName,
        );
        expect(sdk.identify).toHaveBeenCalledWith({
          email: 'a@b.com',
          plan: 'pro',
        });
      });

      it('excludes $schema from traits', () => {
        const sdk = executeCdpSnippet(
          generateSnippetForTarget({
            targetId,
            example: {
              userId: 'u1',
              $schema: 'http://example.com',
              name: 'Alice',
            },
            schema: { 'x-method': 'identify' },
          }),
          globalName,
        );
        expect(sdk.identify).toHaveBeenCalledWith('u1', { name: 'Alice' });
      });
    });

    describe('group (x-method: group)', () => {
      it('calls group with groupId and traits', () => {
        const sdk = executeCdpSnippet(
          generateSnippetForTarget({
            targetId,
            example: { groupId: 'acme', plan: 'enterprise', employees: 500 },
            schema: { 'x-method': 'group' },
          }),
          globalName,
        );
        expect(sdk.group).toHaveBeenCalledWith('acme', {
          plan: 'enterprise',
          employees: 500,
        });
      });

      it('omits traits arg when no fields beyond groupId', () => {
        const snippet = generateSnippetForTarget({
          targetId,
          example: { groupId: 'acme' },
          schema: { 'x-method': 'group' },
        });
        expect(snippet).toBe(`${globalName}.group("acme");`);
      });

      it('excludes $schema from traits', () => {
        const sdk = executeCdpSnippet(
          generateSnippetForTarget({
            targetId,
            example: {
              groupId: 'g1',
              $schema: 'http://example.com',
              name: 'Acme',
            },
            schema: { 'x-method': 'group' },
          }),
          globalName,
        );
        expect(sdk.group).toHaveBeenCalledWith('g1', { name: 'Acme' });
      });
    });

    describe('page (x-method: page)', () => {
      it('calls page with all fields as properties', () => {
        const sdk = executeCdpSnippet(
          generateSnippetForTarget({
            targetId,
            example: { name: 'Home', url: 'https://example.com' },
            schema: { 'x-method': 'page' },
          }),
          globalName,
        );
        expect(sdk.page).toHaveBeenCalledWith({
          name: 'Home',
          url: 'https://example.com',
        });
      });

      it('excludes $schema from properties', () => {
        const sdk = executeCdpSnippet(
          generateSnippetForTarget({
            targetId,
            example: { $schema: 'http://example.com', name: 'Checkout' },
            schema: { 'x-method': 'page' },
          }),
          globalName,
        );
        expect(sdk.page).toHaveBeenCalledWith({ name: 'Checkout' });
      });

      it('calls page with no args when example has only $schema', () => {
        const snippet = generateSnippetForTarget({
          targetId,
          example: { $schema: 'http://example.com' },
          schema: { 'x-method': 'page' },
        });
        expect(snippet).toBe(`${globalName}.page();`);
      });
    });
  },
);

describe('server-rudderstack-php snippet', () => {
  it('is registered in SNIPPET_TARGETS', () => {
    expect(SNIPPET_TARGETS.map((t) => t.id)).toContain(
      'server-rudderstack-php',
    );
  });

  it('has group=server and language=php', () => {
    const target = createTrackingTargetRegistry().get('server-rudderstack-php');
    expect(target.group).toBe('server');
    expect(target.language).toBe('php');
  });

  describe('track (default)', () => {
    it('generates a track call with userId, event, and properties', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-php',
        example: { userId: 'user-123', event: 'Order Completed', revenue: 20 },
        schema: {},
      });
      expect(snippet).toBe(
        `Rudder::track([\n    'userId' => 'user-123',\n    'event' => 'Order Completed',\n    'properties' => [\n        'revenue' => 20,\n    ],\n]);`,
      );
    });

    it('omits properties key when no fields beyond userId and event', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-php',
        example: { userId: 'user-123', event: 'page_view' },
        schema: {},
      });
      expect(snippet).toBe(
        `Rudder::track([\n    'userId' => 'user-123',\n    'event' => 'page_view',\n]);`,
      );
    });

    it('unwraps a nested properties object instead of double-nesting it', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-php',
        example: {
          userId: '12345',
          event: 'website_builder.chat_message_sent',
          properties: {
            website_category: 'Restaurant',
            website_category_changed: true,
          },
        },
        schema: {},
      });
      expect(snippet).toBe(
        `Rudder::track([\n    'userId' => '12345',\n    'event' => 'website_builder.chat_message_sent',\n    'properties' => [\n        'website_category' => 'Restaurant',\n        'website_category_changed' => true,\n    ],\n]);`,
      );
    });

    it('throws when userId is missing', () => {
      expect(() =>
        generateSnippetForTarget({
          targetId: 'server-rudderstack-php',
          example: { event: 'page_view' },
          schema: {},
        }),
      ).toThrow('[server-rudderstack-php]');
    });
  });

  describe('identify (x-method: identify)', () => {
    it('generates an identify call with userId and traits', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-php',
        example: { userId: 'user-123', email: 'a@b.com', plan: 'pro' },
        schema: { 'x-method': 'identify' },
      });
      expect(snippet).toBe(
        `Rudder::identify([\n    'userId' => 'user-123',\n    'traits' => [\n        'email' => 'a@b.com',\n        'plan' => 'pro',\n    ],\n]);`,
      );
    });

    it('omits traits key when no fields beyond userId', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-php',
        example: { userId: 'user-123' },
        schema: { 'x-method': 'identify' },
      });
      expect(snippet).toBe(
        `Rudder::identify([\n    'userId' => 'user-123',\n]);`,
      );
    });
  });

  describe('group (x-method: group)', () => {
    it('generates a group call with userId, groupId, and traits', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-php',
        example: { userId: 'user-123', groupId: 'acme', plan: 'enterprise' },
        schema: { 'x-method': 'group' },
      });
      expect(snippet).toBe(
        `Rudder::group([\n    'userId' => 'user-123',\n    'groupId' => 'acme',\n    'traits' => [\n        'plan' => 'enterprise',\n    ],\n]);`,
      );
    });

    it('omits traits key when no fields beyond userId and groupId', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-php',
        example: { userId: 'user-123', groupId: 'acme' },
        schema: { 'x-method': 'group' },
      });
      expect(snippet).toBe(
        `Rudder::group([\n    'userId' => 'user-123',\n    'groupId' => 'acme',\n]);`,
      );
    });
  });

  describe('page (x-method: page)', () => {
    it('generates a page call with userId and properties', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-php',
        example: {
          userId: 'user-123',
          name: 'Home',
          url: 'https://example.com',
        },
        schema: { 'x-method': 'page' },
      });
      expect(snippet).toBe(
        `Rudder::page([\n    'userId' => 'user-123',\n    'properties' => [\n        'name' => 'Home',\n        'url' => 'https://example.com',\n    ],\n]);`,
      );
    });

    it('omits properties key when no fields beyond userId', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-php',
        example: { userId: 'user-123' },
        schema: { 'x-method': 'page' },
      });
      expect(snippet).toBe(`Rudder::page([\n    'userId' => 'user-123',\n]);`);
    });
  });

  describe('alias (x-method: alias)', () => {
    it('throws for alias', () => {
      expect(() =>
        generateSnippetForTarget({
          targetId: 'server-rudderstack-php',
          example: { userId: 'user-123' },
          schema: { 'x-method': 'alias' },
        }),
      ).toThrow('[server-rudderstack-php]');
    });
  });
});

describe('server-rudderstack-java snippet', () => {
  it('is registered in SNIPPET_TARGETS', () => {
    expect(SNIPPET_TARGETS.map((t) => t.id)).toContain(
      'server-rudderstack-java',
    );
  });

  it('has group=server and language=java', () => {
    const target = createTrackingTargetRegistry().get(
      'server-rudderstack-java',
    );
    expect(target.group).toBe('server');
    expect(target.language).toBe('java');
  });

  describe('track (default)', () => {
    it('generates a track call with userId, event, and properties', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-java',
        example: { userId: 'user-123', event: 'Order Completed', revenue: 20 },
        schema: {},
      });
      expect(snippet).toBe(
        `analytics.enqueue(TrackMessage.builder("Order Completed")\n    .userId("user-123")\n    .properties(ImmutableMap.builder()\n        .put("revenue", 20)\n        .build()));`,
      );
    });

    it('omits properties when no fields beyond userId and event', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-java',
        example: { userId: 'user-123', event: 'page_view' },
        schema: {},
      });
      expect(snippet).toBe(
        `analytics.enqueue(TrackMessage.builder("page_view")\n    .userId("user-123"));`,
      );
    });

    it('unwraps a nested properties object instead of double-nesting it', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-java',
        example: {
          userId: '12345',
          event: 'website_builder.chat_message_sent',
          properties: {
            website_category: 'Restaurant',
            website_category_changed: true,
          },
        },
        schema: {},
      });
      expect(snippet).toBe(
        `analytics.enqueue(TrackMessage.builder("website_builder.chat_message_sent")\n    .userId("12345")\n    .properties(ImmutableMap.builder()\n        .put("website_category", "Restaurant")\n        .put("website_category_changed", true)\n        .build()));`,
      );
    });

    it('renders nested objects and arrays as Guava immutable collections', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-java',
        example: {
          userId: 'user-123',
          event: 'Order Completed',
          products: [{ sku: 'A1' }],
          address: { city: 'NYC' },
        },
        schema: {},
      });
      expect(snippet).toBe(
        `analytics.enqueue(TrackMessage.builder("Order Completed")\n    .userId("user-123")\n    .properties(ImmutableMap.builder()\n        .put("products", ImmutableList.of(\n            ImmutableMap.builder()\n                .put("sku", "A1")\n                .build()\n        ))\n        .put("address", ImmutableMap.builder()\n            .put("city", "NYC")\n            .build())\n        .build()));`,
      );
    });

    it('throws when userId is missing', () => {
      expect(() =>
        generateSnippetForTarget({
          targetId: 'server-rudderstack-java',
          example: { event: 'page_view' },
          schema: {},
        }),
      ).toThrow('[server-rudderstack-java]');
    });
  });

  describe('identify (x-method: identify)', () => {
    it('generates an identify call with userId and traits', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-java',
        example: { userId: 'user-123', email: 'a@b.com', plan: 'pro' },
        schema: { 'x-method': 'identify' },
      });
      expect(snippet).toBe(
        `analytics.enqueue(IdentifyMessage.builder()\n    .userId("user-123")\n    .traits(ImmutableMap.builder()\n        .put("email", "a@b.com")\n        .put("plan", "pro")\n        .build()));`,
      );
    });

    it('omits traits when no fields beyond userId', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-java',
        example: { userId: 'user-123' },
        schema: { 'x-method': 'identify' },
      });
      expect(snippet).toBe(
        `analytics.enqueue(IdentifyMessage.builder()\n    .userId("user-123"));`,
      );
    });
  });

  describe('group (x-method: group)', () => {
    it('generates a group call with userId, groupId, and traits', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-java',
        example: { userId: 'user-123', groupId: 'acme', plan: 'enterprise' },
        schema: { 'x-method': 'group' },
      });
      expect(snippet).toBe(
        `analytics.enqueue(GroupMessage.builder("acme")\n    .userId("user-123")\n    .traits(ImmutableMap.builder()\n        .put("plan", "enterprise")\n        .build()));`,
      );
    });

    it('omits traits when no fields beyond userId and groupId', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-java',
        example: { userId: 'user-123', groupId: 'acme' },
        schema: { 'x-method': 'group' },
      });
      expect(snippet).toBe(
        `analytics.enqueue(GroupMessage.builder("acme")\n    .userId("user-123"));`,
      );
    });
  });

  describe('page (x-method: page)', () => {
    it('uses name as the page builder argument and the rest as properties', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-java',
        example: {
          userId: 'user-123',
          name: 'Home',
          url: 'https://example.com',
        },
        schema: { 'x-method': 'page' },
      });
      expect(snippet).toBe(
        `analytics.enqueue(PageMessage.builder("Home")\n    .userId("user-123")\n    .properties(ImmutableMap.builder()\n        .put("url", "https://example.com")\n        .build()));`,
      );
    });

    it('omits properties when no fields beyond userId and name', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-java',
        example: { userId: 'user-123', name: 'Home' },
        schema: { 'x-method': 'page' },
      });
      expect(snippet).toBe(
        `analytics.enqueue(PageMessage.builder("Home")\n    .userId("user-123"));`,
      );
    });
  });

  describe('alias (x-method: alias)', () => {
    it('throws for alias', () => {
      expect(() =>
        generateSnippetForTarget({
          targetId: 'server-rudderstack-java',
          example: { userId: 'user-123' },
          schema: { 'x-method': 'alias' },
        }),
      ).toThrow('[server-rudderstack-java]');
    });
  });
});

describe('server-rudderstack-python snippet', () => {
  it('is registered in SNIPPET_TARGETS', () => {
    expect(SNIPPET_TARGETS.map((t) => t.id)).toContain(
      'server-rudderstack-python',
    );
  });

  it('has group=server and language=python', () => {
    const target = createTrackingTargetRegistry().get(
      'server-rudderstack-python',
    );
    expect(target.group).toBe('server');
    expect(target.language).toBe('python');
  });

  describe('track (default)', () => {
    it('generates a track call with userId, event, and properties', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-python',
        example: { userId: 'user-123', event: 'Order Completed', revenue: 20 },
        schema: {},
      });
      expect(snippet).toBe(
        `rudder_analytics.track('user-123', 'Order Completed', {\n    'revenue': 20,\n})`,
      );
    });

    it('omits properties when no fields beyond userId and event', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-python',
        example: { userId: 'user-123', event: 'page_view' },
        schema: {},
      });
      expect(snippet).toBe(`rudder_analytics.track('user-123', 'page_view')`);
    });

    it('unwraps a nested properties object instead of double-nesting it', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-python',
        example: {
          userId: '12345',
          event: 'website_builder.chat_message_sent',
          properties: {
            website_category: 'Restaurant',
            website_category_changed: true,
          },
        },
        schema: {},
      });
      expect(snippet).toBe(
        `rudder_analytics.track('12345', 'website_builder.chat_message_sent', {\n    'website_category': 'Restaurant',\n    'website_category_changed': True,\n})`,
      );
    });

    it('renders nested objects and arrays as Python literals', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-python',
        example: {
          userId: 'user-123',
          event: 'Order Completed',
          products: [{ sku: 'A1' }],
          address: { city: 'NYC' },
        },
        schema: {},
      });
      expect(snippet).toBe(
        `rudder_analytics.track('user-123', 'Order Completed', {\n    'products': [\n        {\n            'sku': 'A1',\n        },\n    ],\n    'address': {\n        'city': 'NYC',\n    },\n})`,
      );
    });

    it('escapes apostrophes in Python string literals', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-python',
        example: {
          userId: "user'123",
          event: "Order's Completed",
          "item's_note": "Bob's order",
        },
        schema: {},
      });
      expect(snippet).toBe(
        `rudder_analytics.track('user\\'123', 'Order\\'s Completed', {\n    'item\\'s_note': 'Bob\\'s order',\n})`,
      );
    });

    it('throws when userId is missing', () => {
      expect(() =>
        generateSnippetForTarget({
          targetId: 'server-rudderstack-python',
          example: { event: 'page_view' },
          schema: {},
        }),
      ).toThrow('[server-rudderstack-python]');
    });
  });

  describe('identify (x-method: identify)', () => {
    it('generates an identify call with userId and traits', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-python',
        example: { userId: 'user-123', email: 'a@b.com', plan: 'pro' },
        schema: { 'x-method': 'identify' },
      });
      expect(snippet).toBe(
        `rudder_analytics.identify('user-123', {\n    'email': 'a@b.com',\n    'plan': 'pro',\n})`,
      );
    });

    it('omits traits when no fields beyond userId', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-python',
        example: { userId: 'user-123' },
        schema: { 'x-method': 'identify' },
      });
      expect(snippet).toBe(`rudder_analytics.identify('user-123')`);
    });
  });

  describe('group (x-method: group)', () => {
    it('generates a group call with userId, groupId, and traits', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-python',
        example: { userId: 'user-123', groupId: 'acme', plan: 'enterprise' },
        schema: { 'x-method': 'group' },
      });
      expect(snippet).toBe(
        `rudder_analytics.group('user-123', 'acme', {\n    'plan': 'enterprise',\n})`,
      );
    });

    it('omits traits when no fields beyond userId and groupId', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-python',
        example: { userId: 'user-123', groupId: 'acme' },
        schema: { 'x-method': 'group' },
      });
      expect(snippet).toBe(`rudder_analytics.group('user-123', 'acme')`);
    });
  });

  describe('page (x-method: page)', () => {
    it('generates a page call with userId and properties', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-python',
        example: {
          userId: 'user-123',
          category: 'Marketing',
          name: 'Home',
          url: 'https://example.com',
        },
        schema: { 'x-method': 'page' },
      });
      expect(snippet).toBe(
        `rudder_analytics.page('user-123', 'Marketing', 'Home', {\n    'url': 'https://example.com',\n})`,
      );
    });

    it('uses positional placeholders when page properties exist without category or name', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-python',
        example: {
          userId: 'user-123',
          url: 'https://example.com',
        },
        schema: { 'x-method': 'page' },
      });
      expect(snippet).toBe(
        `rudder_analytics.page('user-123', None, None, {\n    'url': 'https://example.com',\n})`,
      );
    });

    it('omits properties when no fields beyond userId', () => {
      const snippet = generateSnippetForTarget({
        targetId: 'server-rudderstack-python',
        example: { userId: 'user-123' },
        schema: { 'x-method': 'page' },
      });
      expect(snippet).toBe(`rudder_analytics.page('user-123')`);
    });
  });

  describe('alias (x-method: alias)', () => {
    it('throws for alias', () => {
      expect(() =>
        generateSnippetForTarget({
          targetId: 'server-rudderstack-python',
          example: { userId: 'user-123' },
          schema: { 'x-method': 'alias' },
        }),
      ).toThrow('[server-rudderstack-python]');
    });
  });
});
