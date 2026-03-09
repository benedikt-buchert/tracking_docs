import Foundation

@MainActor
public enum AnalyticsRecorder {
  public static var lastEventName: String?
  public static var lastEventParameters: [String: Any]?
  public static var userProperties: [String: String?] = [:]

  public static func reset() {
    lastEventName = nil
    lastEventParameters = nil
    userProperties = [:]
  }
}

@MainActor
public enum Analytics {
  public static func logEvent(_ name: String, parameters: [String: Any]?) {
    AnalyticsRecorder.lastEventName = name
    AnalyticsRecorder.lastEventParameters = parameters
  }

  public static func setUserProperty(_ value: String?, forName name: String) {
    AnalyticsRecorder.userProperties[name] = value
  }
}

public let AnalyticsEventScreenView = "screen_view"
public let AnalyticsEventAddToCart = "add_to_cart"

public let AnalyticsParameterScreenName = "screen_name"
public let AnalyticsParameterScreenClass = "screen_class"
public let AnalyticsParameterCurrency = "currency"
public let AnalyticsParameterValue = "value"
public let AnalyticsParameterItems = "items"
public let AnalyticsParameterItemID = "item_id"
public let AnalyticsParameterItemName = "item_name"
public let AnalyticsParameterPrice = "price"
public let AnalyticsParameterQuantity = "quantity"

public let AnalyticsUserPropertySignUpMethod = "sign_up_method"
public let AnalyticsUserPropertyAllowAdPersonalizationSignals = "allow_personalized_ads"
