package com.trackingdocs.nativepayload;

final class GeneratedAndroidSnippets {
  private GeneratedAndroidSnippets() {}

  // Generated from contract: screen-view-predefined
  static void runScreenViewPredefined(FakeFirebaseAnalytics mFirebaseAnalytics) {
    Bundle eventParams = new Bundle();
    eventParams.putString(FirebaseAnalytics.Param.SCREEN_NAME, "Checkout");
    eventParams.putString(FirebaseAnalytics.Param.SCREEN_CLASS, "CheckoutViewController");
    mFirebaseAnalytics.logEvent(FirebaseAnalytics.Event.SCREEN_VIEW, eventParams);
  }

  // Generated from contract: add-to-cart-with-items
  static void runAddToCartWithItems(FakeFirebaseAnalytics mFirebaseAnalytics) {
    Bundle item1 = new Bundle();
    item1.putString(FirebaseAnalytics.Param.ITEM_ID, "sku-1");
    item1.putString(FirebaseAnalytics.Param.ITEM_NAME, "Socks");
    item1.putDouble(FirebaseAnalytics.Param.PRICE, 21.25);
    item1.putLong(FirebaseAnalytics.Param.QUANTITY, 2L);

    Bundle eventParams = new Bundle();
    eventParams.putString(FirebaseAnalytics.Param.CURRENCY, "EUR");
    eventParams.putDouble(FirebaseAnalytics.Param.VALUE, 42.5);
    eventParams.putParcelableArray(FirebaseAnalytics.Param.ITEMS, new Parcelable[]{item1});
    mFirebaseAnalytics.logEvent(FirebaseAnalytics.Event.ADD_TO_CART, eventParams);
  }

  // Generated from contract: custom-event-with-user-properties
  static void runCustomEventWithUserProperties(FakeFirebaseAnalytics mFirebaseAnalytics) {
    mFirebaseAnalytics.setUserProperty(FirebaseAnalytics.UserProperty.SIGN_UP_METHOD, "email");
    mFirebaseAnalytics.setUserProperty(FirebaseAnalytics.UserProperty.ALLOW_AD_PERSONALIZATION_SIGNALS, "false");

    Bundle eventParams = new Bundle();
    eventParams.putString("plan", "pro");
    eventParams.putLong("count", 2L);
    eventParams.putLong("premium", 1L);
    mFirebaseAnalytics.logEvent("my_custom_event", eventParams);
  }

  // Generated from contract: firebase-unsupported-ecommerce-key
  static void runFirebaseUnsupportedEcommerceKey(FakeFirebaseAnalytics mFirebaseAnalytics) {
    Bundle item1 = new Bundle();
    item1.putString(FirebaseAnalytics.Param.ITEM_ID, "sku-unsupported-1");
    item1.putString(FirebaseAnalytics.Param.ITEM_NAME, "Hat");
    item1.putString("unsupported_dimension", "blue-xl");

    Bundle eventParams = new Bundle();
    eventParams.putString(FirebaseAnalytics.Param.CURRENCY, "EUR");
    eventParams.putDouble(FirebaseAnalytics.Param.VALUE, 19.99);
    eventParams.putParcelableArray(FirebaseAnalytics.Param.ITEMS, new Parcelable[]{item1});
    mFirebaseAnalytics.logEvent(FirebaseAnalytics.Event.ADD_TO_CART, eventParams);
  }

  // Generated from contract: firebase-unsupported-event-name
  static void runFirebaseUnsupportedEventName(FakeFirebaseAnalytics mFirebaseAnalytics) {
    Bundle eventParams = new Bundle();
    eventParams.putString("plan", "basic");
    eventParams.putLong("count", 1L);
    mFirebaseAnalytics.logEvent("unsupported_mobile_event_name", eventParams);
  }
}
