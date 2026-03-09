import Foundation
import Testing
@testable import NativePayloadFixtures
import NativePayloadFixturesObjC

@MainActor
struct NativePayloadFixturesTests {
  private func canonicalJSON(_ value: Any?) throws -> String {
    guard let value else {
      return "null"
    }
    let object = normalize(value)
    let data = try JSONSerialization.data(withJSONObject: object, options: [.sortedKeys])
    return String(decoding: data, as: UTF8.self)
  }

  private func normalize(_ value: Any) -> Any {
    if let map = value as? [String: Any] {
      var normalized: [String: Any] = [:]
      for (key, val) in map {
        normalized[key] = normalize(val)
      }
      return normalized
    }

    if let list = value as? [Any] {
      return list.map(normalize)
    }

    if let map = value as? [AnyHashable: Any] {
      var normalized: [String: Any] = [:]
      for (key, val) in map {
        normalized[String(describing: key)] = normalize(val)
      }
      return normalized
    }

    return value
  }

  @Test
  func screenViewPredefined() throws {
    AnalyticsRecorder.reset()
    GeneratedIosSnippets.runScreenViewPredefined()

    #expect(AnalyticsRecorder.lastEventName == "screen_view")
    #expect(
      try canonicalJSON(AnalyticsRecorder.lastEventParameters)
        == canonicalJSON([
          "screen_name": "Checkout",
          "screen_class": "CheckoutViewController",
        ])
    )
    #expect(AnalyticsRecorder.userProperties.count == 0)
  }

  @Test
  func addToCartWithItems() throws {
    AnalyticsRecorder.reset()
    GeneratedIosSnippets.runAddToCartWithItems()

    #expect(AnalyticsRecorder.lastEventName == "add_to_cart")
    #expect(
      try canonicalJSON(AnalyticsRecorder.lastEventParameters)
        == canonicalJSON([
          "currency": "EUR",
          "value": 42.5,
          "items": [
            [
              "item_id": "sku-1",
              "item_name": "Socks",
              "price": 21.25,
              "quantity": 2,
            ],
          ],
        ])
    )
    #expect(AnalyticsRecorder.userProperties.count == 0)
  }

  @Test
  func customEventWithUserProperties() throws {
    AnalyticsRecorder.reset()
    GeneratedIosSnippets.runCustomEventWithUserProperties()

    #expect(AnalyticsRecorder.lastEventName == "my_custom_event")
    #expect(
      try canonicalJSON(AnalyticsRecorder.lastEventParameters)
        == canonicalJSON([
          "plan": "pro",
          "count": 2,
          "premium": 1,
        ])
    )
    #expect(AnalyticsRecorder.userProperties["sign_up_method"]! == "email")
    #expect(AnalyticsRecorder.userProperties["allow_personalized_ads"]! == "false")
  }

  @Test
  func objcScreenViewPredefined() throws {
    ObjCAnalyticsRecorderReset()
    RunObjCSnippetScreenViewPredefined()

    #expect(ObjCAnalyticsLastEventName() == "screen_view")
    #expect(
      try canonicalJSON(ObjCAnalyticsLastEventParameters())
        == canonicalJSON([
          "screen_name": "Checkout",
          "screen_class": "CheckoutViewController",
        ])
    )
    #expect(try canonicalJSON(ObjCAnalyticsUserProperties()) == canonicalJSON([:]))
  }

  @Test
  func objcAddToCartWithItems() throws {
    ObjCAnalyticsRecorderReset()
    RunObjCSnippetAddToCartWithItems()

    #expect(ObjCAnalyticsLastEventName() == "add_to_cart")
    #expect(
      try canonicalJSON(ObjCAnalyticsLastEventParameters())
        == canonicalJSON([
          "currency": "EUR",
          "value": 42.5,
          "items": [
            [
              "item_id": "sku-1",
              "item_name": "Socks",
              "price": 21.25,
              "quantity": 2,
            ],
          ],
        ])
    )
    #expect(try canonicalJSON(ObjCAnalyticsUserProperties()) == canonicalJSON([:]))
  }

  @Test
  func objcCustomEventWithUserProperties() throws {
    ObjCAnalyticsRecorderReset()
    RunObjCSnippetCustomEventWithUserProperties()

    #expect(ObjCAnalyticsLastEventName() == "my_custom_event")
    #expect(
      try canonicalJSON(ObjCAnalyticsLastEventParameters())
        == canonicalJSON([
          "plan": "pro",
          "count": 2,
          "premium": 1,
        ])
    )
    #expect(
      try canonicalJSON(ObjCAnalyticsUserProperties())
        == canonicalJSON([
          "sign_up_method": "email",
          "allow_personalized_ads": "false",
        ])
    )
  }
}
