# Vendored `@org/ui` design system — `skill-web-components@0.4.0`

These files are a **vendored build** of the Lit + light-DOM + Tailwind-v4 design
system from `~/src/skill-web-components` (repo `biliboss/skill-web-components`),
tag `@org/ui@0.4.0`. Vendored (not an npm dep) because the package is private and
uses internal `workspace:*` deps that don't resolve cross-repo yet.

## Files
- `org-ui.js` — single self-contained ESM bundle (atoms + molecules, Lit inlined).
  Importing it registers all custom elements (`ui-text`, `ui-heading`, `ui-badge`,
  `ui-button`, `ui-nav`, `ui-hero`, `ui-card`, `ui-post-meta`, `ui-post-card`,
  `ui-footer`). Zero bare imports — safe to bundle anywhere.
- `ui.css` — precompiled Tailwind v4 `ui:*` utilities + `:root { --ui-* }` token
  defaults. Self-contained plain CSS (NOT processed by canna's Tailwind, so no
  prefix collision with the unprefixed `@import "tailwindcss"` in global.css).

## Theming (per-project)
Canna brand (emerald green) is applied by overriding `--ui-*` vars in
`src/styles/ds-theme.css` — no token rebuild. Load order: `ui.css` → `ds-theme.css`.

## Refresh procedure (when skill ships a new version)
```sh
cd ~/src/skill-web-components
pnpm -F @org/ui build
npx esbuild packages/ui/src/index.ts --bundle --format=esm \
  --outfile=~/src/canna-br/apps/docs/src/lib/org-ui/org-ui.js
npx @tailwindcss/cli -i examples/tailwind.input.css -o /tmp/ui.css   # then copy
cp examples/ui.css ~/src/canna-br/apps/docs/src/lib/org-ui/ui.css
```
TODO: replace vendoring with a published registry dep once `@org/ui` ships to GitHub Packages.
