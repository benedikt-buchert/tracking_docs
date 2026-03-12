package com.trackingdocs.nativepayload;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

public class NativePayloadAndroidTest {
  @Test
  void screenViewPredefined() {
    FakeFirebaseAnalytics analytics = new FakeFirebaseAnalytics();

    GeneratedAndroidSnippets.runScreenViewPredefined(analytics);

    assertEquals("screen_view", analytics.lastEventName);
    assertEquals(
        mapOf(
            entry("screen_name", "Checkout"),
            entry("screen_class", "CheckoutViewController")),
        analytics.lastEventParams);
    assertEquals(Map.of(), analytics.userProperties);
    PayloadSchemaValidator.validateScreenView(
        analytics.lastEventParams, analytics.userProperties);
  }

  @Test
  void addToCartWithItems() {
    FakeFirebaseAnalytics analytics = new FakeFirebaseAnalytics();

    GeneratedAndroidSnippets.runAddToCartWithItems(analytics);

    assertEquals("add_to_cart", analytics.lastEventName);
    assertEquals(
        mapOf(
            entry("currency", "EUR"),
            entry("value", Double.valueOf(42.5)),
            entry(
                "items",
                List.of(
                    mapOf(
                        entry("item_id", "sku-1"),
                        entry("item_name", "Socks"),
                        entry("price", Double.valueOf(21.25)),
                        entry("quantity", Long.valueOf(2L)))))),
        analytics.lastEventParams);
    assertEquals(Map.of(), analytics.userProperties);
    PayloadSchemaValidator.validateAddToCart(
        analytics.lastEventParams, analytics.userProperties);
    PayloadSchemaValidator.validateAddToCartSourceExample(
        mapOf(
            entry("event", "add_to_cart"),
            entry("currency", "EUR"),
            entry("value", Double.valueOf(42.5)),
            entry(
                "items",
                List.of(
                    mapOf(
                        entry("item_id", "sku-1"),
                        entry("item_name", "Socks"),
                        entry("price", Double.valueOf(21.25)),
                        entry("quantity", Long.valueOf(2L)))))));
  }

  @Test
  void customEventWithUserProperties() {
    FakeFirebaseAnalytics analytics = new FakeFirebaseAnalytics();

    GeneratedAndroidSnippets.runCustomEventWithUserProperties(analytics);

    assertEquals("my_custom_event", analytics.lastEventName);
    assertEquals(
        mapOf(
            entry("plan", "pro"),
            entry("count", Long.valueOf(2L)),
            entry("premium", Long.valueOf(1L))),
        analytics.lastEventParams);
    assertEquals(
        mapOf(
            entry("sign_up_method", "email"),
            entry("allow_personalized_ads", "false")),
        analytics.userProperties);
    PayloadSchemaValidator.validateCustomEvent(
        analytics.lastEventParams, analytics.userProperties);
  }

  @Test
  void loginWithUserProperties() {
    FakeFirebaseAnalytics analytics = new FakeFirebaseAnalytics();

    GeneratedAndroidSnippets.runLoginWithUserProperties(analytics);

    assertEquals("login", analytics.lastEventName);
    assertEquals(
        mapOf(entry("method", "email")),
        analytics.lastEventParams);
    assertEquals(
        mapOf(
            entry("sign_up_method", "email"),
            entry("allow_personalized_ads", "false")),
        analytics.userProperties);
    PayloadSchemaValidator.validateLoginWithUserPropertiesSourceExample(
        mapOf(
            entry("event", "login"),
            entry("method", "email"),
            entry(
                "user_properties",
                mapOf(
                    entry("sign_up_method", "email"),
                    entry("allow_ad_personalization_signals", "false")))));
  }

  private static Map<String, Object> mapOf(Map.Entry<String, Object>... entries) {
    Map<String, Object> map = new LinkedHashMap<>();
    for (Map.Entry<String, Object> entry : entries) {
      map.put(entry.getKey(), entry.getValue());
    }
    return map;
  }

  private static Map.Entry<String, Object> entry(String key, Object value) {
    return Map.entry(key, value);
  }
}

interface Parcelable {}

final class Bundle implements Parcelable {
  private final Map<String, Object> values = new LinkedHashMap<>();

  void putString(String key, String value) {
    values.put(key, value);
  }

  void putLong(String key, long value) {
    values.put(key, Long.valueOf(value));
  }

  void putDouble(String key, double value) {
    values.put(key, Double.valueOf(value));
  }

  void putParcelableArray(String key, Parcelable[] value) {
    List<Object> mapped = new ArrayList<>();
    for (Parcelable item : value) {
      if (item instanceof Bundle) {
        mapped.add(((Bundle) item).toMap());
      } else {
        mapped.add(item);
      }
    }
    values.put(key, mapped);
  }

  Map<String, Object> toMap() {
    return new LinkedHashMap<>(values);
  }
}

final class FakeFirebaseAnalytics {
  String lastEventName;
  Map<String, Object> lastEventParams;
  final Map<String, Object> userProperties = new LinkedHashMap<>();

  void logEvent(String eventName, Bundle params) {
    this.lastEventName = eventName;
    this.lastEventParams = params == null ? null : params.toMap();
  }

  void setUserProperty(String name, String value) {
    userProperties.put(name, value);
  }
}

final class FirebaseAnalytics {
  private FirebaseAnalytics() {}

  static final class Event {
    static final String SCREEN_VIEW = "screen_view";
    static final String ADD_TO_CART = "add_to_cart";
    static final String LOGIN = "login";

    private Event() {}
  }

  static final class Param {
    static final String SCREEN_NAME = "screen_name";
    static final String SCREEN_CLASS = "screen_class";
    static final String CURRENCY = "currency";
    static final String VALUE = "value";
    static final String ITEMS = "items";
    static final String ITEM_ID = "item_id";
    static final String ITEM_NAME = "item_name";
    static final String PRICE = "price";
    static final String QUANTITY = "quantity";
    static final String METHOD = "method";

    private Param() {}
  }

  static final class UserProperty {
    static final String SIGN_UP_METHOD = "sign_up_method";
    static final String ALLOW_AD_PERSONALIZATION_SIGNALS = "allow_personalized_ads";

    private UserProperty() {}
  }
}
