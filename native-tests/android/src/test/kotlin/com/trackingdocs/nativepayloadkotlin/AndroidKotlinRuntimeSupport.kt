package com.trackingdocs.nativepayloadkotlin

class Bundle {
  private val values = linkedMapOf<String, Any>()

  fun putString(key: String, value: String) {
    values[key] = value
  }

  fun putLong(key: String, value: Long) {
    values[key] = value
  }

  fun putDouble(key: String, value: Double) {
    values[key] = value
  }

  fun toMap(): Map<String, Any> = LinkedHashMap(values)
}

class EventParamsBuilder {
  private val values = linkedMapOf<String, Any>()

  fun param(key: String, value: String) {
    values[key] = value
  }

  fun param(key: String, value: Long) {
    values[key] = value
  }

  fun param(key: String, value: Double) {
    values[key] = value
  }

  fun param(key: String, value: Array<Bundle>) {
    values[key] = value.map { it.toMap() }
  }

  fun toMap(): Map<String, Any> = LinkedHashMap(values)
}

class FakeFirebaseAnalyticsKotlin {
  var lastEventName: String? = null
  var lastEventParams: Map<String, Any>? = null
  val userProperties = linkedMapOf<String, String?>()

  fun logEvent(eventName: String, block: EventParamsBuilder.() -> Unit) {
    val builder = EventParamsBuilder().apply(block)
    lastEventName = eventName
    lastEventParams = builder.toMap()
  }

  fun setUserProperty(name: String, value: String?) {
    userProperties[name] = value
  }
}

object FirebaseAnalytics {
  object Event {
    const val SCREEN_VIEW = "screen_view"
    const val ADD_TO_CART = "add_to_cart"
    const val LOGIN = "login"
  }

  object Param {
    const val SCREEN_NAME = "screen_name"
    const val SCREEN_CLASS = "screen_class"
    const val CURRENCY = "currency"
    const val VALUE = "value"
    const val ITEMS = "items"
    const val ITEM_ID = "item_id"
    const val ITEM_NAME = "item_name"
    const val PRICE = "price"
    const val QUANTITY = "quantity"
    const val METHOD = "method"
  }

  object UserProperty {
    const val SIGN_UP_METHOD = "sign_up_method"
    const val ALLOW_AD_PERSONALIZATION_SIGNALS = "allow_personalized_ads"
  }
}
