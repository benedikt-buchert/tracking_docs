import FirebaseAnalytics
import FirebaseObjCCompileProbe
import Testing

struct FirebaseSdkCompileTests {
  @Test
  func firebaseAnalyticsSymbolsAndCallShapesAreValid() {
    let logEventFn: (String, [String: Any]?) -> Void = Analytics.logEvent
    let setUserPropertyFn: (String?, String) -> Void = Analytics.setUserProperty

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
