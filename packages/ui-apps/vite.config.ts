import { readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const here = fileURLToPath(new URL(".", import.meta.url));

const SLUGS = [
  "member-quota-card",
  "traceability-timeline",
  "dispensation-form",
] as const;
export type AppSlug = (typeof SLUGS)[number];

/**
 * vite-plugin-singlefile sets `output.inlineDynamicImports: true`, which
 * Rollup refuses when there is more than one input in a single build. We
 * therefore build each app in its own Vite invocation; this config picks
 * which one based on the `CANNA_APP` env var (defaults to the first slug).
 *
 * The orchestrator script `scripts/build.mjs` walks every slug, calls Vite
 * for each, then flattens the nested output (`dist/<slug>/app.html` →
 * `dist/<slug>.html`) so the manifest's `htmlBundlePath` resolves cleanly.
 *
 * Running `vite build` directly without `CANNA_APP` still works for the
 * first app — handy for ad-hoc debugging — but `pnpm build` must be used
 * to emit all three bundles.
 */
const slug = (process.env.CANNA_APP ?? SLUGS[0]) as AppSlug;
if (!SLUGS.includes(slug)) {
  throw new Error(
    `Unknown CANNA_APP="${slug}"; expected one of ${SLUGS.join(", ")}`,
  );
}

/**
 * Flatten `dist/<slug>/app.html` → `dist/<slug>.html` after Vite finishes so
 * the manifest paths (`dist/<slug>.html`) match the on-disk layout.
 */
const flattenHtml = (target: AppSlug): Plugin => ({
  name: "canna:flatten-html",
  apply: "build",
  closeBundle() {
    const outDir = resolve(here, "dist");
    const nested = resolve(outDir, target, "app.html");
    const flat = resolve(outDir, `${target}.html`);
    try {
      statSync(nested);
    } catch {
      return;
    }
    renameSync(nested, flat);
    const nestedDir = dirname(nested);
    try {
      if (readdirSync(nestedDir).length === 0) {
        rmSync(nestedDir, { recursive: true, force: true });
      }
    } catch {
      // best-effort cleanup
    }
  },
});

export default defineConfig({
  root: resolve(here, "src"),
  base: "./",
  publicDir: false,
  plugins: [viteSingleFile(), flattenHtml(slug)],
  build: {
    outDir: resolve(here, "dist"),
    // Only the first slug's invocation clears the output dir; the orchestrator
    // controls this via `CANNA_EMPTY_OUT_DIR=1`.
    emptyOutDir: process.env.CANNA_EMPTY_OUT_DIR === "1",
    assetsInlineLimit: Number.POSITIVE_INFINITY,
    cssCodeSplit: false,
    sourcemap: false,
    target: "es2022",
    rollupOptions: {
      input: { [slug]: resolve(here, `src/${slug}/app.html`) },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name][extname]",
        manualChunks: undefined,
      },
    },
  },
});

export const ALL_SLUGS: readonly AppSlug[] = SLUGS;
