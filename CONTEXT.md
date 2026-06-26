# Tracking Docs

This context describes tracking schemas and the destination-specific targets used to render implementation examples.

## Language

**Tracking Schema**:
A contract that describes a trackable event payload.

**Tracking Target**:
A destination-specific surface that a **Tracking Schema** can support.
_Avoid_: Extension

**Sync Addon**:
adapter that projects **Tracking Schemas** into an external system.
_Avoid_: Tracking Target

**Tracking Reference**:
A documented collection of **Tracking Schemas** for a coherent usage context.

**User Alias**:
A secondary identifier attached to a user profile when the primary user identity is not the right identifier for a use case.

## Relationships

- A **Tracking Schema** supports one or more **Tracking Targets**.
- A **Tracking Reference** contains one or more **Tracking Schemas**.
- A **Sync Addon** may consume **Tracking Schemas** for one or more **Tracking Targets**.

## Example dialogue

> **Dev:** "Should Braze be added as an extension?"
> **Domain expert:** "Call it a **Tracking Target**; Braze is one destination-specific target a **Tracking Schema** can support."

> **Dev:** "Should GTM variable sync become a **Tracking Target** method?"
> **Domain expert:** "No, make it a **Sync Addon** so **Tracking Targets** stay focused on examples."

## Flagged ambiguities

- "extension" was used to mean **Tracking Target**.
