# Docusaurus Plugin Generate Schema Docs

This repository contains a Docusaurus v3 plugin for generating documentation from JSON schemas.

## Live Demo

You can find a live demo of the site [here](https://tracking-docs-demo.buchert.digital/tracking_docs/).

## Bootstrapping from Template (new Docusaurus site)

Run the following to bootstrap a Docusaurus v3 site (classic theme) with docusaurus-plugin-generate-schema-docs:

```bash
npx create-docusaurus@3.7.0 my-website https://github.com/benedikt-buchert/tracking_docs.git --git-strategy copy
```

See more info in the [docusaurus docs](https://docusaurus.io/docs/api/misc/create-docusaurus).

```bash
cd my-website
npm start
```

If all goes well, you should be greeted by a brand new Docusaurus site that includes the example documentation.

## Installation (existing Docusaurus site)

### Plugin

```bash
npm install --save docusaurus-plugin-generate-schema-docs
```

### Configuration

In `docusaurus.config.js`, add the plugin to your configuration:

```javascript
module.exports = {
  // ...
  plugins: ['docusaurus-plugin-generate-schema-docs'],
  // ...
};
```

## How it Works

The project follows a schema-first approach.

1. **Define a schema:** Create or update a `.json` file in the `static/schemas/` directory. You can create complex schemas by referencing reusable components from `static/schemas/components/`.
2. **Generate documentation:** The plugin reads the schemas, resolves any references, and generates corresponding `.mdx` documentation file in `docs/events/`.
3. **View the documentation:** The website's sidebar is automatically updated to include the newly generated documentation.

### The `static/schemas` Directory

This is the single source of truth for all tracking events. Each `.json` file in this directory represents an event. You can use `$ref` to include shared definitions from the `static/schemas/components/` directory.

### Manual Documentation Generation

If you need to generate the documentation without starting the development server, you can run:

```bash
npm run gen-docs
```

## Schema Validation

A validation script is included to check the integrity of your schemas. This is useful for CI/CD pipelines.

To validate all schemas, run:

```bash
npm run validate-schemas
```

## Versioning

This plugin supports Docusaurus versioning for both documentation and schemas. When you create a new version, both the docs and schemas are versioned together.

### Creating a New Version

**Important:** Do NOT use the standard `docusaurus docs:version` command, as it only versions documentation files and not the schemas. Instead, use the custom command provided by this plugin:

```bash
npm run version 1.2.0
```

This is a shortcut for:

```bash
npx docusaurus version-with-schemas 1.2.0
```

### What This Command Does

The `version-with-schemas` command performs the following steps automatically:

1. **Creates docs version** - Runs the standard Docusaurus `docs:version` command to copy `docs/` to `versioned_docs/version-<version>/`
2. **Copies schemas** - Copies `static/schemas/next/` to `static/schemas/<version>/`
3. **Updates schema IDs** - Updates all `$id` fields in the versioned schemas to include the version number
4. **Generates documentation** - Generates MDX documentation for the new version

### Directory Structure

With versioning enabled, your project structure will look like:

```
demo/
├── docs/                           # Current/next version docs (auto-generated)
├── versioned_docs/
│   └── version-1.1.1/             # Versioned docs
│       └── events/                # Event documentation for v1.1.1
├── static/
│   └── schemas/
│       ├── next/                  # Current/next version schemas (source of truth)
│       └── 1.1.1/                 # Versioned schemas for v1.1.1
└── versions.json                  # List of all versions
```

### Configuring Version Labels

In `docusaurus.config.js`, you can configure how versions are displayed:

```javascript
module.exports = {
  presets: [
    [
      'classic',
      {
        docs: {
          lastVersion: '1.1.1',  // The latest stable version
          versions: {
            current: {
              label: 'next',           // Label for unreleased version
              banner: 'unreleased',    // Shows "unreleased" banner
            },
          },
        },
      },
    ],
  ],
};
```

### Workflow for New Versions

1. **Work on next version** - Make changes to schemas in `static/schemas/next/`
2. **Test locally** - The dev server automatically generates docs from the `next` schemas
3. **Create version** - When ready to release, run `npm run version 1.2.0`
4. **Commit changes** - The command creates new directories and updates `versions.json`
5. **Continue development** - Keep working on `static/schemas/next/` for the next release

### Other Versioning Commands

Update schema IDs for a specific version (useful if you need to change the base URL):

```bash
npm run update-schema-ids 1.2.0
```

Update schema IDs for all versions:

```bash
npm run update-schema-ids
```

## Deployment

Deployment is handled automatically by a GitHub Action. Pushing changes to the `main` branch will trigger a workflow that builds the website and deplates it to GitHub Pages.
