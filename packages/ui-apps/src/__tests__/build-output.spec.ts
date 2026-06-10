import { execSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// @ts-expect-error — .mjs sibling has no .d.ts, but `auditBundles` is well-typed via JSDoc.
import { auditBundles, BUNDLES, MAX_BYTES } from "../../scripts/verify-bundles.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const PKG_ROOT = resolve(HERE, "..", "..");
const DIST = resolve(PKG_ROOT, "dist");

const SHOULD_SKIP = process.env.CANNA_SKIP_BUNDLE_BUILD === "1";

/**
 * Integration test that runs `vite build` and validates each emitted bundle.
 * Skip with `CANNA_SKIP_BUNDLE_BUILD=1` to keep the inner-loop fast — the
 * unit suite (registry.spec.ts) still runs.
 */
describe.skipIf(SHOULD_SKIP)("@canna/ui-apps / build output (integration)", () => {
  it(
    "vite build emits self-contained single-file bundles for all 3 MCP Apps",
    () => {
      // Drive the workspace's own orchestrator so the test mirrors what
      // `pnpm --filter @canna/ui-apps build:apps` does — one vite build per
      // MCP App slug.
      execSync("node scripts/build.mjs", {
        cwd: PKG_ROOT,
        stdio: "pipe",
        env: { ...process.env, NODE_ENV: "production" },
      });

      for (const slug of BUNDLES as readonly string[]) {
        const file = resolve(DIST, `${slug}.html`);
        expect(existsSync(file), `expected ${file} to exist`).toBe(true);
        const stat = statSync(file);
        expect(stat.size).toBeGreaterThan(0);
        expect(stat.size).toBeLessThanOrEqual(MAX_BYTES as number);
      }

      const reports = auditBundles() as ReadonlyArray<{
        slug: string;
        ok: boolean;
        violations: readonly string[];
        sizeBytes: number;
      }>;
      expect(reports).toHaveLength((BUNDLES as readonly string[]).length);
      for (const r of reports) {
        expect(r.violations, `${r.slug} violations`).toEqual([]);
        expect(r.ok, `${r.slug} ok`).toBe(true);
      }
    },
    // vite build for 3 tiny HTML inputs is fast (<5s on M-series) but allow
    // generous headroom for CI cold cache.
    60_000,
  );
});
