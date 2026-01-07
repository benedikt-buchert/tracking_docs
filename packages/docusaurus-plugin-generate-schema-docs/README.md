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
          },
        ],
      ],
      // ...
    };
    ```

2.  Place your JSON schemas in the `schemas` directory at the root of your project.

## CLI Commands

### Generate Documentation

To generate the documentation from your schemas, run the following command:

```bash
npx docusaurus generate schema-docs
```

This will generate MDX files in the `docs/events` directory.

### Validate Schemas

To validate your schemas, run the following command:

```bash
npx docusaurus validate-schemas
```

This will validate the schemas in the `schemas` directory.

## How it Works

The plugin reads your JSON schemas, dereferences any `$ref` properties, and merges `allOf` properties. It then generates an MDX file for each schema, which uses custom React components to render the schema details.

The validation script builds an example from each schema and validates it against the schema itself, ensuring your examples are always in sync with your schemas.

## Partials

You can provide additional content to the generated documentation pages by creating partial files. Partials are Markdown files that can be automatically included in the generated pages.

### Naming Convention

Partials must be named after the schema file they correspond to. For a schema named `my-event.json`, the partials would be:

*   `my-event.mdx`: This partial is rendered directly after the schema's main description.
*   `my-event_bottom.mdx`: This partial is rendered at the very bottom of the page.

### Location

Place your partial files in the `/docs/partials` directory at the root of your docusaurus project. The plugin will automatically find and include them.

### Example

If you have a schema `add-to-cart-event.json`, you can create the following files:

*   `docs/partials/add-to-cart-event.mdx`: For content to appear after the description.
*   `docs/partials/add-to-cart-event_bottom.mdx`: For content to appear at the bottom.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request if you have any ideas or improvements.

## License

This project is licensed under the MIT License.
