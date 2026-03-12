package com.trackingdocs.nativepayloadkotlin

object GeneratedAndroidKotlinSnippets {
  // Generated from contract: screen-view-predefined
  fun runScreenViewPredefined(firebaseAnalytics: FakeFirebaseAnalyticsKotlin) {
    firebaseAnalytics.logEvent(FirebaseAnalytics.Event.SCREEN_VIEW) {
      param(FirebaseAnalytics.Param.SCREEN_NAME, "Checkout")
      param(FirebaseAnalytics.Param.SCREEN_CLASS, "CheckoutViewController")
    }
  }

  // Generated from contract: add-to-cart-with-items
  fun runAddToCartWithItems(firebaseAnalytics: FakeFirebaseAnalyticsKotlin) {
    val item1 = Bundle().apply {
      putString(FirebaseAnalytics.Param.ITEM_ID, "sku-1")
      putString(FirebaseAnalytics.Param.ITEM_NAME, "Socks")
      putDouble(FirebaseAnalytics.Param.PRICE, 21.25)
      putLong(FirebaseAnalytics.Param.QUANTITY, 2L)
    }

    firebaseAnalytics.logEvent(FirebaseAnalytics.Event.ADD_TO_CART) {
      param(FirebaseAnalytics.Param.CURRENCY, "EUR")
      param(FirebaseAnalytics.Param.VALUE, 42.5)
      param(FirebaseAnalytics.Param.ITEMS, arrayOf(item1))
    }
  }

  // Generated from contract: custom-event-with-user-properties
  fun runCustomEventWithUserProperties(firebaseAnalytics: FakeFirebaseAnalyticsKotlin) {
    firebaseAnalytics.setUserProperty(FirebaseAnalytics.UserProperty.SIGN_UP_METHOD, "email")
    firebaseAnalytics.setUserProperty(FirebaseAnalytics.UserProperty.ALLOW_AD_PERSONALIZATION_SIGNALS, "false")

    firebaseAnalytics.logEvent("my_custom_event") {
      param("plan", "pro")
      param("count", 2L)
      param("premium", 1L)
    }
  }

  // Generated from contract: login-with-user-properties
  fun runLoginWithUserProperties(firebaseAnalytics: FakeFirebaseAnalyticsKotlin) {
    firebaseAnalytics.setUserProperty(FirebaseAnalytics.UserProperty.SIGN_UP_METHOD, "email")
    firebaseAnalytics.setUserProperty(FirebaseAnalytics.UserProperty.ALLOW_AD_PERSONALIZATION_SIGNALS, "false")

    firebaseAnalytics.logEvent(FirebaseAnalytics.Event.LOGIN) {
      param(FirebaseAnalytics.Param.METHOD, "email")
    }
  }
}
