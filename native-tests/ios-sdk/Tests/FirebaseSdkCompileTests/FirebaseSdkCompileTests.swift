import FirebaseAnalytics
import FirebaseObjCCompileProbe
import Testing

struct FirebaseSdkCompileTests {
  @Test
  func firebaseAnalyticsSymbolsAndCallShapesAreValid() {
    let logEventFn: (String, [String: Any]?) -> Void = Analytics.logEvent
    let setUserPropertyFn: (String?, String) -> Void = Analytics.setUserProperty

    Analytics.logEvent("unsupported_mobile_event_name", parameters: [
      "unsupported_dimension": "blue-xl",
      AnalyticsParameterItems: [
        [
          AnalyticsParameterItemID: "sku-unsupported-1",
          "unsupported_dimension": "blue-xl",
        ],
      ],
    ])

    #expect(AnalyticsEventScreenView == "screen_view")
    #expect(AnalyticsEventAddToCart == "add_to_cart")
    #expect(AnalyticsParameterItems == "items")
    #expect(AnalyticsUserPropertySignUpMethod == "sign_up_method")

    // Keep references alive so compile-time function signature checks are enforced.
    _ = logEventFn
    _ = setUserPropertyFn

    #expect(FirebaseObjCCompileProbeValidate())
  }
}
