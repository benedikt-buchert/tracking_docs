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

## Release Process

This project has a separated release process for the demo site and the plugin.

### Demo Site Release

1.  **Create a Pull Request**: Make your changes to the schemas in the `static/schemas/next` directory on a new branch and open a pull request.
2.  **Create a Demo Version**: To create a new version of the demo site for previewing, add a comment to your pull request with the following format:
    `/release-demo <version>`
    For example: `/release-demo 1.2.0`
3.  **CI Magic**: A GitHub Action will automatically run, generate the new version of the documentation and schemas, and push a new commit to your pull request branch.
4.  **Preview**: The existing CI workflow will then build a preview of your pull request on Netlify, which will include the new version of the demo site.
5.  **Merge**: Once you are happy with the preview, you can merge the pull request. The `gh-pages` workflow will then deploy the updated site to production.

Alternatively, you can run the versioning command manually:

```bash
npm run version 1.2.0
```

This is a shortcut for:

```bash
npx docusaurus version-with-schemas 1.2.0
```

#### What This Command Does

The `version-with-schemas` command performs the following steps automatically:

1. **Creates docs version** - Runs the standard Docusaurus `docs:version` command to copy `docs/` to `versioned_docs/version-<version>/`
2. **Copies schemas** - Copies `static/schemas/next/` to `static/schemas/<version>/`
3. **Updates schema IDs** - Updates all `$id` fields in the versioned schemas to include the version number
4. **Generates documentation** - Generates MDX documentation for the new version

#### Directory Structure

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

### Plugin Release

1.  **Tag the `main` branch**: To release a new version of the plugin, create a tag on the `main` branch with the format `plugin-v<version>` and push it to the repository.
    `git tag plugin-v1.2.0`
    `git push origin plugin-v1.2.0`
2.  **CI Magic**: A GitHub Action will automatically run, update the plugin's version, publish it to npm, and create a GitHub Release.

### Other Versioning Commands

Update schema IDs for a specific version (useful if you need to change the base URL):

```bash
npm run update-schema-ids 1.2.0
```

Update schema IDs for all versions:

```bash
npm run update-schema-ids
```

