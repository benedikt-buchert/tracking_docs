# Docusaurus Plugin: Generate Schema Docs

This Docusaurus v2 plugin generates documentation from JSON schemas. It provides a set of tools to automatically create and validate documentation for your event schemas.

## Features

- **Automatic Documentation Generation**: Generates MDX documentation from your JSON schemas.
- **Schema Validation**: Validates your schemas against the examples provided within them.
- **CLI Commands**: Provides CLI commands to generate and validate schema documentation.
- **Custom Components**: Includes React components to beautifully render your schema documentation.

## Installation

```bash
npm install --save docusaurus-plugin-generate-schema-docs
```

## Usage

1.  Configure the plugin in your `docusaurus.config.js`:

    ```javascript
    // docusaurus.config.js

    module.exports = {
      // ...
      plugins: [
        [
          'docusaurus-plugin-generate-schema-docs',
          {
            // Options if any
            dataLayerName: 'customDataLayer',
          },
        ],
      ],
      // ...
    };
    ```

    The `dataLayerName` option allows you to customize the name of the data layer variable in the generated examples. If not provided, it defaults to `dataLayer`.

2.  Place your JSON schemas in the `schemas` directory at the root of your project.

## CLI Commands

### Generate Documentation

To generate the documentation from your schemas, run the following command:

```bash
npm run gen-docs
```

This will generate MDX files in the `docs/events` directory.

### Validate Schemas

To validate your schemas, run the following command:

```bash
npm run validate-schemas
```

This will validate the schemas in the `schemas` directory.

### Update Schema IDs

When using versioning, you can update the `$id` of your versioned schemas by running:

```bash
npm run update-schema-ids
```

This command will update the `$id` of all schemas in the versioned directories.

## How it Works

The plugin reads your JSON schemas, dereferences any `$ref` properties, and merges `allOf` properties. It then generates an MDX file for each schema, which uses custom React components to render the schema details.

The validation script builds an example from each schema and validates it against the schema itself, ensuring your examples are always in sync with your schemas.

## Schema Composition (anyOf, oneOf)

The plugin has special handling for `anyOf` and `oneOf` keywords in your JSON schemas.

### `anyOf`

When `anyOf` is used, the plugin will render a dropdown menu in the documentation that allows users to switch between the different sub-schemas. This is useful for representing properties that can have multiple different structures.

### `oneOf`

Similar to `anyOf`, `oneOf` will also render a dropdown menu.

#### `oneOf` at the Root Level

A special behavior is triggered when `oneOf` is used at the root level of a schema file. If a schema's top-level definition is a `oneOf` array, the plugin will generate a directory structure that reflects the choices.

For example, given a schema `my-event.json` with a `oneOf` at the root, where each item in the `oneOf` array is a reference to another schema file (e.g., `option-a.json`, `option-b.json`), the plugin will generate the following structure:

- `docs/events/my-event/`: A directory for the parent schema.
- `docs/events/my-event/index.mdx`: An index page for `my-event`.
- `docs/events/my-event/option-a.mdx`: A page for the first option.
- `docs/events/my-event/option-b.mdx`: A page for the second option.

This creates a nested navigation structure in Docusaurus, which is useful for grouping related events or entities under a single menu item.

## Versioning

This plugin supports documentation and schema versioning, integrated with Docusaurus's native versioning system.

### Enabling Versioning

To enable versioning, you need to:

1.  **Enable Docusaurus Versioning**: Follow the [Docusaurus documentation](https://docusaurus.io/docs/versioning) to enable versioning for your site. This typically involves creating a `versions.json` file.

2.  **Organize Your Schemas**: Create a versioned directory structure for your schemas. Instead of placing your schemas in `static/schemas`, you should have:
    - `static/schemas/next`: For the "current" or "next" version of your schemas.
    - `static/schemas/<version>`: For each version of your schemas (e.g., `static/schemas/1.1.1`).

When versioning is enabled, the plugin will automatically detect the `versions.json` file and generate documentation for each version, as well as for the `current` version.

### Non-Versioned Mode

If you do not have a `versions.json` file in your `siteDir`, the plugin will run in non-versioned mode. It will read your schemas from `static/schemas` and generate documentation in `docs/events`.

### Schema `$id` Versioning

When using the versioning feature, the plugin will automatically update the `$id` of your schemas to include the version number. For example, if your site's `url` is `https://example.com` and you have a schema `my-event.json` in version `1.0.0`, the `$id` will be updated to `https://example.com/schemas/1.0.0/my-event.json`.

This is done automatically by the plugin. However, if you need to update the `$id`s of your schemas manually, you can use the `update-schema-ids.js` script located in the plugin's `helpers` directory.

## Partials

You can provide additional content to the generated documentation pages by creating partial files. Partials are Markdown files that can be automatically included in the generated pages.

### Naming Convention

Partials must be named after the schema file they correspond to. For a schema named `my-event.json`, the partials would be:

- `my-event.mdx`: This partial is rendered directly after the schema's main description.
- `my-event_bottom.mdx`: This partial is rendered at the very bottom of the page.

### Location

Place your partial files in the `/docs/partials` directory at the root of your docusaurus project. The plugin will automatically find and include them.

### Example

If you have a schema `add-to-cart-event.json`, you can create the following files:

- `docs/partials/add-to-cart-event.mdx`: For content to appear after the description.
- `docs/partials/add-to-cart-event_bottom.mdx`: For content to appear at the bottom.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request if you have any ideas or improvements.

## License

This project is licensed under the MIT License.
