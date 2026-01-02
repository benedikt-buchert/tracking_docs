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

1. **Define a schema:** Create or update a `.json` file in the `schemas/` directory. You can create complex schemas by referencing reusable components from `schemas/components/`.
2. **Generate documentation:** The plugin reads the schemas, resolves any references, and generates corresponding `.mdx` documentation file in `docs/events/`.
3. **View the documentation:** The website's sidebar is automatically updated to include the newly generated documentation.

### The `schemas` Directory

This is the single source of truth for all tracking events. Each `.json` file in this directory represents an event. You can use `$ref` to include shared definitions from the `schemas/components/` directory.

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

## Deployment

Deployment is handled automatically by a GitHub Action. Pushing changes to the `main` branch will trigger a workflow that builds the website and deplates it to GitHub Pages.
