# Docusaurus Plugin Generate Schema Docs

This repository contains a Docusaurus v3 plugin for generating documentation from JSON schemas.

## Documentation Map

- [Main README (this file)](./README.md): Monorepo usage, demo workflows, release process, and contributor quick start.
- [Plugin README](./packages/docusaurus-plugin-generate-schema-docs/README.md): Plugin API, options, schema layout, and CLI command behavior.

## Prerequisites

- Node.js `>=20.0` (see `demo/package.json`)
- npm `>=10`

## Live Demo

You can find a live demo of the site [here](https://tracking-docs-demo.buchert.digital/).

## Bootstrapping from Template (new Docusaurus site)

Run the following to bootstrap a Docusaurus v3 site (classic theme) with `docusaurus-plugin-generate-schema-docs`:

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

## GTM Sync Workflow Setup

The GTM sync GitHub workflow (`.github/workflows/sync-gtm.yml`) is manual (`workflow_dispatch`) and uses service-account auth in CI.

### Required GitHub configuration

1. Add repository secret `GTM_SERVICE_ACCOUNT_KEY`
   Store the full JSON key content (not a file path).
2. Add repository variable `GTM_ACCOUNT_ID`
   Your Google Tag Manager account ID.
3. Add repository variable `GTM_CONTAINER_ID`
   Your Google Tag Manager container ID.

That is all required to run the workflow.

For local usage, authenticate with `gtm auth login` (or other supported auth methods) per the official GTM CLI docs:
https://github.com/owntag/gtm-cli#authentication

Important: `sync:gtm` applies real changes to the configured GTM workspace/container. Run it only against the intended account/container.

## Contributor Quick Start

```bash
npm ci
npm test
npm run test:payload
npm run lint
npm run gen-docs
npm run validate-schemas
npm run build
```

## Payload Contract Test Matrix

Canonical emitted-payload contracts live in:
`packages/docusaurus-plugin-generate-schema-docs/test-data/payloadContracts.js`

Representative event classes covered:
- predefined event (`screen_view`)
- ecommerce event with `items` (`add_to_cart`)
- custom event (`my_custom_event`)
- fallback JSON serialization case (`metadata_capture`, web target)

Local commands:

```bash
npm run sync:native-fixtures
npm run test:payload:web
npm run test:payload:android
npm run test:payload:ios
npm run test:native:android
npm run test:native:ios
npm run test:realsdk:android
npm run test:realsdk:ios
```

Native fixture sources are auto-generated from `generateSnippetForTarget`:
- iOS: `native-tests/ios/Sources/NativePayloadFixtures/GeneratedSnippets.swift`
- iOS Obj-C: `native-tests/ios/Sources/NativePayloadFixturesObjC/GeneratedObjCSnippets.m`
- Android: `native-tests/android/src/test/java/com/trackingdocs/nativepayload/GeneratedAndroidSnippets.java`
- Android Kotlin: `native-tests/android/src/test/kotlin/com/trackingdocs/nativepayloadkotlin/GeneratedAndroidKotlinSnippets.kt`

Use `npm run check:native-fixtures` to regenerate and fail if committed files are stale.

Real SDK compile checks:
- Android: `scripts/test-android-realsdk.mjs` downloads the real `firebase-analytics` + measurement artifacts and validates both Java and Kotlin call shapes against `FirebaseAnalytics`.
- iOS: `native-tests/ios-sdk` validates Swift API usage (`Analytics`) and Obj-C symbols (`FIRAnalytics` constants/selectors) against the real Firebase iOS SDK (`FirebaseAnalytics`).

Version overrides:
- Android real SDK check reads `FIREBASE_ANDROID_ANALYTICS_VERSION` (default: `22.5.0`).
- iOS real SDK check reads `FIREBASE_IOS_SDK_VERSION` (default: `11.15.0`).

CI runs real SDK checks in matrix mode:
- Android analytics versions: `22.4.0`, `22.5.0`
- iOS SDK versions: `11.14.0`, `11.15.0`

CI lanes:
- `validate-linux` (ubuntu-latest): lint, full Jest suite except iOS runtime payload lane, Android native payload tests (`mvn test`), docs generation, build, schema validation
- `validate-ios-payload` (macos-latest): iOS runtime payload contract tests (`npm run test:payload:ios`) and iOS native payload tests (`swift test`)

## Release Process

This project has separate release processes for the demo site and the plugin.

### Demo Site Release

1.  **Create a Pull Request**: Make your changes in `demo/static/schemas/next` on a new branch and open a pull request.
2.  **Create a Demo Version**: To create a new version of the demo site for previewing, add a comment to your pull request with the following format:
    `/release-demo <version>`
    For example: `/release-demo 1.2.0`
3.  **CI Magic**: A GitHub Action will automatically run, generate the new version of the documentation and schemas, and push a new commit to your pull request branch.
4.  **Preview/Test**: The existing CI workflow will run validation, tests, docs generation, and build checks for the PR.
5.  **Merge**: Once you are happy with the preview, you can merge the pull request. The `gh-pages` workflow will then deploy the updated site to production.

Alternatively, you can run the versioning command manually:

```bash
npm run version -- 1.2.0
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

1.  **Tag the `main` branch**: To release a new version of the plugin, create a semantic version tag (for example `1.2.0`) on `main` and push it to the repository.
    `git tag 1.2.0`
    `git push origin 1.2.0`
2.  **CI Magic**: A GitHub Action will automatically run, update the plugin's version, publish it to npm, and create a GitHub Release.

### Other Versioning Commands

Update schema IDs for a specific version (useful if you need to change the base URL):

```bash
npm run update-schema-ids -- 1.2.0
```

Update schema IDs for all versions:

```bash
npm run update-schema-ids
```
