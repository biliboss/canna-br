#!/usr/bin/env node
/**
 * build.mjs — multi-app Vite orchestrator for @canna/ui-apps.
 *
 * Walks every MCP App slug and invokes `vite build` once per app. This
 * sidesteps Rollup's "multiple inputs are not supported when
 * output.inlineDynamicImports is true" guardrail that vite-plugin-singlefile
 * triggers when several HTML inputs share a single build.
 *
 * On a clean machine this is ~0.5 s × 3 apps = ~1.5 s total.
 */

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(HERE, "..");

export const SLUGS = [
  "member-quota-card",
  "traceability-timeline",
  "dispensation-form",
  "member-lifecycle-board",
];

const runVite = (slug, { emptyOutDir }) => {
  const result = spawnSync(
    "pnpm",
    ["exec", "vite", "build", "--logLevel", "warn"],
    {
      cwd: PKG_ROOT,
      stdio: "inherit",
      env: {
        ...process.env,
        CANNA_APP: slug,
        CANNA_EMPTY_OUT_DIR: emptyOutDir ? "1" : "0",
      },
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `vite build failed for ${slug} (exit ${result.status ?? "null"})`,
    );
  }
};

const main = () => {
  console.log(`Building ${SLUGS.length} MCP App bundles...`);
  SLUGS.forEach((slug, idx) => {
    console.log(`\n[${idx + 1}/${SLUGS.length}] ${slug}`);
    // Only the first build wipes dist/; subsequent ones append.
    runVite(slug, { emptyOutDir: idx === 0 });
  });
  console.log(`\nAll ${SLUGS.length} bundles built.`);
};

// ESM "is this the entry point?" check.
const argv1 = process.argv[1] ? resolve(process.argv[1]) : "";
if (argv1 === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
