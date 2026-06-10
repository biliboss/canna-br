# @canna/ui-apps

Single-file HTML bundles for the canna-oss MCP Apps (ext-apps SEP-1865).

## What this package ships

Three MCP App iframes that the chat host loads as fully self-contained HTML
strings — no external CSS, no `<script src="https://...">`, no runtime
`fetch` against third-party origins:

| Slug                    | Tool entry point                  | Risk |
|-------------------------|-----------------------------------|------|
| `member-quota-card`     | `get_member_quota`                | 1    |
| `traceability-timeline` | `generate_traceability_report`    | 1    |
| `dispensation-form`     | `draft_dispensation` (Level 3)    | 3    |

Each app has a manifest at `src/<slug>/index.ts` whose `htmlBundlePath`
points to `dist/<slug>.html`.

## Build

```bash
pnpm --filter @canna/ui-apps build         # build + verify (default)
pnpm --filter @canna/ui-apps build:apps    # build only, no verify
pnpm --filter @canna/ui-apps build:check   # re-run audit against last build
```

`build` runs `vite build` once per app (vite-plugin-singlefile sets
`output.inlineDynamicImports: true`, which Rollup forbids with multiple
inputs in a single build) and then runs the verifier.

Output lands at:

```
dist/
  member-quota-card.html
  traceability-timeline.html
  dispensation-form.html
```

Each bundle is < 4 KB today and the verifier ceiling is **200 KB**.

## Verifier (`scripts/verify-bundles.mjs`)

Asserts, per bundle:

- file exists
- no external `<link rel="stylesheet" href="...">`
- no external `<script src="...">` (inline / `data:` only)
- size below 200 KB
- contains the canonical MCP App lifecycle hook
  (`window.addEventListener("message", ...)`)

The same logic is reused by the gated vitest integration test
(`src/__tests__/build-output.spec.ts`) so CI can run a single `pnpm test`
and still catch bundle regressions. Skip the build-driving test with
`CANNA_SKIP_BUNDLE_BUILD=1 pnpm --filter @canna/ui-apps test` for the
inner loop.

## MCP host postMessage contract

The chat host pushes tool results into the iframe:

```ts
window.postMessage(
  {
    type: "ui/notifications/tool-result",
    params: { content: [{ text: JSON.stringify(payload) }] },
  },
  "*",
);
```

The app listens on `window` and renders. Interactive apps post back:

```ts
window.parent.postMessage(
  { type: "ui/tools/call", params: { name: "<tool>", arguments: {...} } },
  "*",
);
```

Level-3 calls (e.g. `request_record_dispensation`) MUST be converted by the
host into a `PendingAction` for RT approval — the iframe never assumes the
tool ran.

## Adding a new app

1. `src/<slug>/app.html` — markup + `<style>` + `<script type="module" src="./main.ts">`
2. `src/<slug>/main.ts` — TypeScript entry; start with `export {};` so
   top-level `const`s stay module-scoped (the package shares one tsconfig).
3. `src/<slug>/index.ts` — export an `AppManifest` with `htmlBundlePath:
   "dist/<slug>.html"`.
4. Register in `src/registry.ts` (`allManifests`) and re-export from
   `src/index.ts`.
5. Add `<slug>` to the `SLUGS` arrays in `vite.config.ts` and
   `scripts/build.mjs`, and to `BUNDLES` in `scripts/verify-bundles.mjs`.
6. `pnpm --filter @canna/ui-apps build` — confirm the new bundle is < 200 KB
   and passes the audit.

## Layout

```
packages/ui-apps/
  package.json
  tsconfig.json            # extends @canna/tsconfig/base + DOM lib
  vite.config.ts           # CANNA_APP-driven single-app build
  vitest.config.ts
  scripts/
    build.mjs              # orchestrates one vite build per slug
    verify-bundles.mjs     # postbuild audit (also reused by vitest)
  src/
    index.ts               # registry + manifest type re-exports
    manifest.ts
    registry.ts
    registry.spec.ts
    __tests__/
      build-output.spec.ts # gated integration test (CANNA_SKIP_BUNDLE_BUILD=1)
    <slug>/
      app.html
      main.ts
      index.ts             # AppManifest
  dist/                    # build output (3 single-file HTMLs)
```
