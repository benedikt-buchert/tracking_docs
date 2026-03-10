# tracking-target-constraints

Reusable target constraint schemas intended to be composed with tracking event schemas via `allOf`.

## Current scope

- Firebase v1 constraints for:
  - `android-firebase-kotlin-sdk`
  - `android-firebase-java-sdk`
  - `ios-firebase-swift-sdk`
  - `ios-firebase-objc-sdk`

The current Firebase v1 constraint enforces flat scalar event params and allows the `items` array with flat scalar item properties.

## Files

- `manifest.json`: target-id to constraint-schema mapping.
- `schemas/firebase/v1/flat-event-params.json`: Firebase v1 constraint schema.
- `dist/`: static output for deployment.

## Commands

```bash
npm run test -w tracking-target-constraints
npm run build -w tracking-target-constraints
```

## Publishing as static URLs

Deploy `packages/tracking-target-constraints/dist` to any static host (for example Cloudflare Pages, Netlify, Vercel static output, S3+CloudFront).

This keeps constraints independently hosted/versioned and avoids coupling them to the demo docs site structure.

### GitHub Pages route (current repository setup)

This repository deploys constraints to the same GitHub Pages site as the demo docs under a separate route:

- `https://tracking-docs-demo.buchert.digital/constraints/manifest.json`
- `https://tracking-docs-demo.buchert.digital/constraints/schemas/firebase/v1/flat-event-params.json`

The `.github/workflows/gh-pages.yml` workflow assembles:
- `demo/build` at the site root
- `packages/tracking-target-constraints/dist` under `/constraints`
