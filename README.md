# Tracking Documentation

This website is built using [Docusaurus](https://docusaurus.io/) and serves as a documentation platform for tracking events, such as those used with Google Tag Manager (GTM) and Google Analytics 4 (GA4).

You can find a live demo of the site [here](https://benedikt-buchert.github.io/tracking_docs/).

The key feature of this project is a custom Docusaurus plugin that automatically generates documentation from a set of [JSON Schemas](https://json-schema.org/). This ensures that the documentation is always in sync with the event definitions.

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Local Development

To start the development server:

```bash
npm run start
```

This command starts a local development server, opens a browser window, and watches for changes. When you create or modify a schema file, the documentation will be automatically regenerated.

## How it Works

The project follows a schema-first approach.

1. **Define a schema:** Create or update a `.json` file in the `schemas/` directory. You can create complex schemas by referencing reusable components from `schemas/components/`.
2. **Generate documentation:** The custom plugin at `src/plugins/generate-schema-docs` reads the schemas, resolves any references, and generates corresponding `.mdx` documentation file in `docs/events/`.
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
