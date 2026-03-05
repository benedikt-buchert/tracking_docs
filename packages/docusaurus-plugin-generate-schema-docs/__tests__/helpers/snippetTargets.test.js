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

    expect(snippet).toContain('Bundle purchaseParams = new Bundle();');
    expect(snippet).toContain(
      'purchaseParams.putString("image_name", "hero.jpg");',
    );
    expect(snippet).toContain('purchaseParams.putLong("count", 2L);');
    expect(snippet).toContain(
      'purchaseParams.putDouble(FirebaseAnalytics.Param.SCORE, 4.5);',
    );
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
    expect(snippet).toContain('AnalyticsParameterScore: 4.5');
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
    expect(snippet).toContain('kFIRParameterScore: @(4.5)');
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

  it('uses firebase constants and concrete item bundles for purchase event', () => {
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
        ecommerce: {
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
      'purchaseParams[AnalyticsParameterItems] = [item1, item2]',
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
      'mFirebaseAnalytics.logEvent(FirebaseAnalytics.Event.SCREEN_VIEW, purchaseParams);',
    );
    expect(snippet).toContain(
      'purchaseParams.putString(FirebaseAnalytics.Param.SCREEN_NAME, "Checkout");',
    );
    expect(snippet).toContain(
      'purchaseParams.putString(FirebaseAnalytics.Param.SCREEN_CLASS, "CheckoutActivity");',
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
      'Analytics.logEvent(AnalyticsEventScreenView, parameters: purchaseParams)',
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
      '[FIRAnalytics logEventWithName:kFIREventScreenView parameters:purchaseParams];',
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
      'Analytics.logEvent(AnalyticsEventLogin, parameters: purchaseParams)',
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
      'mFirebaseAnalytics.logEvent("my_custom_event", purchaseParams);',
    );
    expect(javaSnippet).toContain(
      'purchaseParams.putString("custom_prop", "x");',
    );
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
      '[FIRAnalytics logEventWithName:kFIREventCampaignDetails parameters:purchaseParams];',
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
        ecommerce: {
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
      },
      schema: { properties: {} },
    });
    const objcSnippet = generateSnippetForTarget({
      targetId: 'ios-firebase-objc-sdk',
      example: {
        event: 'add_to_cart',
        ecommerce: {
          item_list_id: 'LIST_42',
          item_list_name: 'Homepage Picks',
          coupon: 'WELCOME10',
        },
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
      'Analytics.logEvent(AnalyticsEventInAppPurchase, parameters: purchaseParams)',
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
});
