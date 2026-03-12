import Foundation
import JSONSchema
import Testing
@testable import NativePayloadFixtures
import NativePayloadFixturesObjC

@MainActor
struct NativePayloadFixturesTests {
  private let addToCartSourceSchemaName = "add-to-cart-event.schema"
  private let loginWithUserPropertiesSourceSchemaName = "login-with-user-properties-event.schema"

  private let screenViewParamsSchema = #"""
  {
    "type": "object",
    "required": ["screen_name", "screen_class"],
    "additionalProperties": false,
    "properties": {
      "screen_name": { "type": "string" },
      "screen_class": { "type": "string" }
    }
  }
  """#

  private let addToCartParamsSchema = #"""
  {
    "type": "object",
    "required": ["currency", "value", "items"],
    "additionalProperties": false,
    "properties": {
      "currency": { "type": "string" },
      "value": { "type": "number" },
      "items": {
        "type": "array",
        "minItems": 1,
        "items": {
          "type": "object",
          "required": ["item_id", "item_name", "price", "quantity"],
          "additionalProperties": false,
          "properties": {
            "item_id": { "type": "string" },
            "item_name": { "type": "string" },
            "price": { "type": "number" },
            "quantity": { "type": "integer" }
          }
        }
      }
    }
  }
  """#

  private let customEventParamsSchema = #"""
  {
    "type": "object",
    "required": ["plan", "count", "premium"],
    "additionalProperties": false,
    "properties": {
      "plan": { "type": "string" },
      "count": { "type": "integer" },
      "premium": { "type": "integer", "enum": [0, 1] }
    }
  }
  """#

  private let emptyObjectSchema = #"""
  {
    "type": "object",
    "maxProperties": 0
  }
  """#

  private let customEventUserPropertiesSchema = #"""
  {
    "type": "object",
    "required": ["sign_up_method", "allow_personalized_ads"],
    "additionalProperties": false,
    "properties": {
      "sign_up_method": { "type": "string" },
      "allow_personalized_ads": { "type": "string", "enum": ["true", "false"] }
    }
  }
  """#

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

  private func validateJsonSchemaInstance(
    _ schemaSource: String,
    instance: Any?
  ) throws {
    let schema = try Schema(instance: schemaSource)
    let normalized = instance.map(normalize) ?? NSNull()
    let data = try JSONSerialization.data(withJSONObject: normalized)
    let instanceJSON = String(decoding: data, as: UTF8.self)
    let result = try schema.validate(instance: instanceJSON)
    #expect(result.isValid)
  }

  private func loadSourceEventSchema(
    _ schemaNameWithoutExtension: String
  ) throws -> String {
    if let directUrl = Bundle.module.url(
      forResource: schemaNameWithoutExtension,
      withExtension: "json"
    ) {
      return try String(contentsOf: directUrl, encoding: .utf8)
    }

    if let nestedUrl = Bundle.module.url(
      forResource: schemaNameWithoutExtension,
      withExtension: "json",
      subdirectory: "Schemas/mobile"
    ) {
      return try String(contentsOf: nestedUrl, encoding: .utf8)
    }

    if let allJsonUrls = Bundle.module.urls(forResourcesWithExtension: "json", subdirectory: nil) {
      let expectedFileName = "\(schemaNameWithoutExtension).json"
      if let matched = allJsonUrls.first(where: { $0.lastPathComponent == expectedFileName }) {
        return try String(contentsOf: matched, encoding: .utf8)
      }
    }

    throw NSError(
      domain: "NativePayloadFixturesTests",
      code: 1,
      userInfo: [NSLocalizedDescriptionKey: "Missing schema resource: \(schemaNameWithoutExtension).json"]
    )
  }

  @Test
  func screenViewPredefined_validatesRuntimeFirebasePayload() throws {
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
    try validateJsonSchemaInstance(
      screenViewParamsSchema,
      instance: AnalyticsRecorder.lastEventParameters
    )
    try validateJsonSchemaInstance(emptyObjectSchema, instance: AnalyticsRecorder.userProperties)
  }

  @Test
  func addToCartWithItems_validatesRuntimeAndSourceSchema() throws {
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
    try validateJsonSchemaInstance(
      addToCartParamsSchema,
      instance: AnalyticsRecorder.lastEventParameters
    )
    try validateJsonSchemaInstance(emptyObjectSchema, instance: AnalyticsRecorder.userProperties)
    try validateJsonSchemaInstance(
      loadSourceEventSchema(addToCartSourceSchemaName),
      instance: [
        "event": "add_to_cart",
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
      ]
    )
  }

  @Test
  func customEventWithUserProperties_validatesRuntimeFirebasePayload() throws {
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
    try validateJsonSchemaInstance(
      customEventParamsSchema,
      instance: AnalyticsRecorder.lastEventParameters
    )
    try validateJsonSchemaInstance(
      customEventUserPropertiesSchema,
      instance: AnalyticsRecorder.userProperties
    )
  }

  @Test
  func objcScreenViewPredefined_validatesRuntimeFirebasePayload() throws {
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
    try validateJsonSchemaInstance(
      screenViewParamsSchema,
      instance: ObjCAnalyticsLastEventParameters()
    )
    try validateJsonSchemaInstance(emptyObjectSchema, instance: ObjCAnalyticsUserProperties())
  }

  @Test
  func objcAddToCartWithItems_validatesRuntimeFirebasePayload() throws {
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
    try validateJsonSchemaInstance(
      addToCartParamsSchema,
      instance: ObjCAnalyticsLastEventParameters()
    )
    try validateJsonSchemaInstance(emptyObjectSchema, instance: ObjCAnalyticsUserProperties())
  }

  @Test
  func loginWithUserProperties_validatesRuntimeAndSourceSchema() throws {
    AnalyticsRecorder.reset()
    GeneratedIosSnippets.runLoginWithUserProperties()

    #expect(AnalyticsRecorder.lastEventName == "login")
    #expect(
      try canonicalJSON(AnalyticsRecorder.lastEventParameters)
        == canonicalJSON([
          "method": "email",
        ])
    )
    #expect(
      try canonicalJSON(AnalyticsRecorder.userProperties)
        == canonicalJSON([
          "sign_up_method": "email",
          "allow_personalized_ads": "false",
        ])
    )
    try validateJsonSchemaInstance(
      loadSourceEventSchema(loginWithUserPropertiesSourceSchemaName),
      instance: [
        "event": "login",
        "method": "email",
        "user_properties": [
          "sign_up_method": "email",
          "allow_ad_personalization_signals": "false",
        ],
      ]
    )
  }

  @Test
  func objcLoginWithUserProperties_validatesRuntimeAndSourceSchema() throws {
    ObjCAnalyticsRecorderReset()
    RunObjCSnippetLoginWithUserProperties()

    #expect(ObjCAnalyticsLastEventName() == "login")
    #expect(
      try canonicalJSON(ObjCAnalyticsLastEventParameters())
        == canonicalJSON([
          "method": "email",
        ])
    )
    #expect(
      try canonicalJSON(ObjCAnalyticsUserProperties())
        == canonicalJSON([
          "sign_up_method": "email",
          "allow_personalized_ads": "false",
        ])
    )
    try validateJsonSchemaInstance(
      loadSourceEventSchema(loginWithUserPropertiesSourceSchemaName),
      instance: [
        "event": "login",
        "method": "email",
        "user_properties": [
          "sign_up_method": "email",
          "allow_ad_personalization_signals": "false",
        ],
      ]
    )
  }

  @Test
  func objcCustomEventWithUserProperties_validatesRuntimeFirebasePayload() throws {
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
    try validateJsonSchemaInstance(
      customEventParamsSchema,
      instance: ObjCAnalyticsLastEventParameters()
    )
    try validateJsonSchemaInstance(
      customEventUserPropertiesSchema,
      instance: ObjCAnalyticsUserProperties()
    )
  }
}
