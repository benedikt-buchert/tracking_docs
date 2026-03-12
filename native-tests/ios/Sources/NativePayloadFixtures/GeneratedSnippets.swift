import Foundation

@MainActor
public enum GeneratedIosSnippets {
  // Generated from contract: screen-view-predefined
  public static func runScreenViewPredefined() {
    var eventParams: [String: Any] = [
      AnalyticsParameterScreenName: "Checkout",
      AnalyticsParameterScreenClass: "CheckoutViewController"
    ]
    Analytics.logEvent(AnalyticsEventScreenView, parameters: eventParams)
  }

  // Generated from contract: add-to-cart-with-items
  public static func runAddToCartWithItems() {
    var item1: [String: Any] = [
      AnalyticsParameterItemID: "sku-1",
      AnalyticsParameterItemName: "Socks",
      AnalyticsParameterPrice: 21.25,
      AnalyticsParameterQuantity: 2
    ]

    var eventParams: [String: Any] = [
      AnalyticsParameterCurrency: "EUR",
      AnalyticsParameterValue: 42.5
    ]
    eventParams[AnalyticsParameterItems] = [item1]
    Analytics.logEvent(AnalyticsEventAddToCart, parameters: eventParams)
  }

  // Generated from contract: custom-event-with-user-properties
  public static func runCustomEventWithUserProperties() {
    Analytics.setUserProperty("email", forName: AnalyticsUserPropertySignUpMethod)
    Analytics.setUserProperty("false", forName: AnalyticsUserPropertyAllowAdPersonalizationSignals)

    var eventParams: [String: Any] = [
      "plan": "pro",
      "count": 2,
      "premium": 1
    ]
    Analytics.logEvent("my_custom_event", parameters: eventParams)
  }

  // Generated from contract: login-with-user-properties
  public static func runLoginWithUserProperties() {
    Analytics.setUserProperty("email", forName: AnalyticsUserPropertySignUpMethod)
    Analytics.setUserProperty("false", forName: AnalyticsUserPropertyAllowAdPersonalizationSignals)

    var eventParams: [String: Any] = [
      AnalyticsParameterMethod: "email"
    ]
    Analytics.logEvent(AnalyticsEventLogin, parameters: eventParams)
  }
}
