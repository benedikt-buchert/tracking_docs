# Tracking Docs

This context describes tracking schemas and the destination-specific targets used to render implementation examples.

## Language

**Tracking Schema**:
A contract that describes a trackable event payload.

**Tracking Target**:
A destination-specific surface that a **Tracking Schema** can support.
_Avoid_: Extension

**Tracking Reference**:
A documented collection of **Tracking Schemas** for a coherent usage context.

**User Alias**:
A secondary identifier attached to a user profile when the primary user identity is not the right identifier for a use case.

## Relationships

- A **Tracking Schema** supports one or more **Tracking Targets**.
- A **Tracking Reference** contains one or more **Tracking Schemas**.

## Example dialogue

> **Dev:** "Should Braze be added as an extension?"
> **Domain expert:** "Call it a **Tracking Target**; Braze is one destination-specific target a **Tracking Schema** can support."

## Flagged ambiguities

- "extension" was used to mean **Tracking Target**.
