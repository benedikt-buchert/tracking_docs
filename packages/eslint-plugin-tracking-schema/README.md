# eslint-plugin-tracking-schema

ESLint plugin that enforces annotation quality on JSON Schema property definitions. Ensures every property has a `description`, a `type`, and `examples` so that auto-generated tracking documentation is complete and accurate.

## Installation

```bash
npm install --save-dev eslint-plugin-tracking-schema jsonc-eslint-parser
```

## Usage

Add the plugin to your ESLint config and apply it to your schema files:

```js
// .eslintrc.js
module.exports = {
  overrides: [
    {
      files: ['static/schemas/**/*.json'],
      parser: 'jsonc-eslint-parser',
      plugins: ['tracking-schema'],
      rules: {
        'tracking-schema/require-description': 'warn',
        'tracking-schema/require-type': 'error',
        'tracking-schema/require-examples': 'error',
      },
    },
  ],
};
```

### Recommended config

Use the built-in recommended config as a starting point:

```js
module.exports = {
  extends: ['plugin:tracking-schema/recommended'],
};
```

### Excluding component schemas

Component schemas used as `$ref` fragments don't need `examples` — those belong on the event schemas that reference them. Disable the rule for component paths:

```js
{
  files: ['static/schemas/**/components/*.json'],
  rules: {
    'tracking-schema/require-examples': 'off',
  },
}
```

## Rules

### `require-description`

Requires every property definition to have a `description` field.

```jsonc
// Bad
"user_id": { "type": "string" }

// Good
"user_id": { "type": "string", "description": "The authenticated user ID." }
```

**Skipped automatically for:**
- Properties with a single `$ref` (the referenced schema carries its own description)
- Properties inside `if` condition blocks
- Constraint-only refinements (e.g. `{ "maxLength": 40 }` in a `then` block)

---

### `require-type`

Requires every property definition to have a `type` field.

```jsonc
// Bad
"value": { "description": "Monetary value.", "examples": [9.99] }

// Good
"value": { "type": "number", "description": "Monetary value.", "examples": [9.99] }
```

**Skipped automatically for:**
- Properties with `$ref`, `const`, `oneOf`, `anyOf`, or `allOf` — these define the type implicitly

---

### `require-examples`

Requires every leaf property definition to have an `examples` array so that generated documentation shows concrete values.

```jsonc
// Bad
"currency": { "type": "string", "description": "ISO 4217 currency code." }

// Good
"currency": { "type": "string", "description": "ISO 4217 currency code.", "examples": ["USD"] }
```

**Skipped automatically for:**
- Properties with `const` or `enum` — the value is already constrained
- Properties with `type: "object"` or `type: "array"` — sub-properties/items carry their own examples
- Properties with `oneOf`, `anyOf`, or `allOf` — examples live inside the branches
- Pure `$ref` properties
- Properties inside `if` condition blocks

## Motivation

When JSON Schemas are used to generate tracking documentation (e.g. via [`docusaurus-plugin-generate-schema-docs`](https://www.npmjs.com/package/docusaurus-plugin-generate-schema-docs)), missing annotations produce incomplete or misleading output:

- Missing `description` → empty description column in the property table
- Missing `type` → unknown type rendered in docs
- Missing `examples` → generated example payloads use placeholder values instead of real ones
