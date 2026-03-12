package com.trackingdocs.nativepayload;

import com.networknt.schema.Error;
import com.networknt.schema.Schema;
import com.networknt.schema.SchemaRegistry;
import com.networknt.schema.SpecificationVersion;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

public final class PayloadSchemaValidator {
  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
  private static final SchemaRegistry SCHEMA_REGISTRY =
      SchemaRegistry.withDefaultDialect(SpecificationVersion.DRAFT_2020_12);

  private static final String SCREEN_VIEW_PARAMS_SCHEMA =
      """
      {
        "type": "object",
        "required": ["screen_name", "screen_class"],
        "additionalProperties": false,
        "properties": {
          "screen_name": { "type": "string" },
          "screen_class": { "type": "string" }
        }
      }
      """;

  private static final String ADD_TO_CART_PARAMS_SCHEMA =
      """
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
      """;

  private static final String CUSTOM_EVENT_PARAMS_SCHEMA =
      """
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
      """;

  private static final String EMPTY_OBJECT_SCHEMA =
      """
      {
        "type": "object",
        "maxProperties": 0
      }
      """;

  private static final String CUSTOM_EVENT_USER_PROPERTIES_SCHEMA =
      """
      {
        "type": "object",
        "required": ["sign_up_method", "allow_personalized_ads"],
        "additionalProperties": false,
        "properties": {
          "sign_up_method": { "type": "string" },
          "allow_personalized_ads": { "type": "string", "enum": ["true", "false"] }
        }
      }
      """;

  private PayloadSchemaValidator() {}

  public static void validateScreenView(Object parameters, Object userProperties) {
    validateAgainstSchema(SCREEN_VIEW_PARAMS_SCHEMA, parameters);
    validateAgainstSchema(EMPTY_OBJECT_SCHEMA, userProperties);
  }

  public static void validateAddToCart(Object parameters, Object userProperties) {
    validateAgainstSchema(ADD_TO_CART_PARAMS_SCHEMA, parameters);
    validateAgainstSchema(EMPTY_OBJECT_SCHEMA, userProperties);
  }

  public static void validateCustomEvent(Object parameters, Object userProperties) {
    validateAgainstSchema(CUSTOM_EVENT_PARAMS_SCHEMA, parameters);
    validateAgainstSchema(CUSTOM_EVENT_USER_PROPERTIES_SCHEMA, userProperties);
  }

  public static void validateAddToCartSourceExample(Object sourcePayload) {
    validateAgainstResourceSchema(
        "schemas/mobile/add-to-cart-event.schema.json", sourcePayload);
  }

  public static void validateLoginWithUserPropertiesSourceExample(
      Object sourcePayload) {
    validateAgainstResourceSchema(
        "schemas/mobile/login-with-user-properties-event.schema.json",
        sourcePayload);
  }

  private static void validateAgainstSchema(String schemaJson, Object payload) {
    try {
      JsonNode schemaNode = OBJECT_MAPPER.readTree(schemaJson);
      Schema schema = SCHEMA_REGISTRY.getSchema(schemaNode);
      JsonNode payloadNode = OBJECT_MAPPER.valueToTree(payload);
      List<Error> errors = schema.validate(payloadNode);
      if (!errors.isEmpty()) {
        throw new AssertionError("Schema validation failed: " + errors);
      }
    } catch (RuntimeException runtime) {
      throw runtime;
    } catch (Exception error) {
      throw new AssertionError("Unable to validate schema payload", error);
    }
  }

  private static void validateAgainstResourceSchema(
      String resourcePath, Object payload) {
    try (InputStream stream =
        PayloadSchemaValidator.class.getClassLoader().getResourceAsStream(
            resourcePath)) {
      if (stream == null) {
        throw new AssertionError("Missing schema resource: " + resourcePath);
      }
      String schemaJson = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
      validateAgainstSchema(schemaJson, payload);
    } catch (AssertionError error) {
      throw error;
    } catch (Exception error) {
      throw new AssertionError(
          "Unable to load schema resource: " + resourcePath, error);
    }
  }
}
