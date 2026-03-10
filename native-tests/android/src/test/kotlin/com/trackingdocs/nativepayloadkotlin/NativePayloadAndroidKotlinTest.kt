package com.trackingdocs.nativepayloadkotlin

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test

class NativePayloadAndroidKotlinTest {
  @Test
  fun screenViewPredefined() {
    val analytics = FakeFirebaseAnalyticsKotlin()

    GeneratedAndroidKotlinSnippets.runScreenViewPredefined(analytics)

    assertEquals("screen_view", analytics.lastEventName)
    assertEquals(
      linkedMapOf(
        "screen_name" to "Checkout",
        "screen_class" to "CheckoutViewController",
      ),
      analytics.lastEventParams,
    )
    assertEquals(emptyMap<String, String?>(), analytics.userProperties)
  }

  @Test
  fun addToCartWithItems() {
    val analytics = FakeFirebaseAnalyticsKotlin()

    GeneratedAndroidKotlinSnippets.runAddToCartWithItems(analytics)

    assertEquals("add_to_cart", analytics.lastEventName)
    assertEquals(
      linkedMapOf(
        "currency" to "EUR",
        "value" to 42.5,
        "items" to listOf(
          linkedMapOf(
            "item_id" to "sku-1",
            "item_name" to "Socks",
            "price" to 21.25,
            "quantity" to 2L,
          ),
        ),
      ),
      analytics.lastEventParams,
    )
    assertEquals(emptyMap<String, String?>(), analytics.userProperties)
  }

  @Test
  fun customEventWithUserProperties() {
    val analytics = FakeFirebaseAnalyticsKotlin()

    GeneratedAndroidKotlinSnippets.runCustomEventWithUserProperties(analytics)

    assertEquals("my_custom_event", analytics.lastEventName)
    assertEquals(
      linkedMapOf(
        "plan" to "pro",
        "count" to 2L,
        "premium" to 1L,
      ),
      analytics.lastEventParams,
    )
    assertEquals(
      linkedMapOf(
        "sign_up_method" to "email",
        "allow_personalized_ads" to "false",
      ),
      analytics.userProperties,
    )
  }

  @Test
  fun unsupportedEcommerceKey() {
    val analytics = FakeFirebaseAnalyticsKotlin()

    GeneratedAndroidKotlinSnippets.runFirebaseUnsupportedEcommerceKey(analytics)

    assertEquals("add_to_cart", analytics.lastEventName)
    assertEquals(
      linkedMapOf(
        "currency" to "EUR",
        "value" to 19.99,
        "items" to listOf(
          linkedMapOf(
            "item_id" to "sku-unsupported-1",
            "item_name" to "Hat",
            "unsupported_dimension" to "blue-xl",
          ),
        ),
      ),
      analytics.lastEventParams,
    )
    assertEquals(emptyMap<String, String?>(), analytics.userProperties)
  }

  @Test
  fun unsupportedEventName() {
    val analytics = FakeFirebaseAnalyticsKotlin()

    GeneratedAndroidKotlinSnippets.runFirebaseUnsupportedEventName(analytics)

    assertEquals("unsupported_mobile_event_name", analytics.lastEventName)
    assertEquals(
      linkedMapOf(
        "plan" to "basic",
        "count" to 1L,
      ),
      analytics.lastEventParams,
    )
    assertEquals(emptyMap<String, String?>(), analytics.userProperties)
  }
}
