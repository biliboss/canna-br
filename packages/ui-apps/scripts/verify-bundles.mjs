#!/usr/bin/env node
/**
 * verify-bundles.mjs — postbuild gate for @canna/ui-apps.
 *
 * Asserts each `dist/<slug>.html` is a true single-file MCP App bundle:
 *  - file exists
 *  - no external `<link rel="stylesheet" href="...">` (all CSS must be inline)
 *  - no external `<script src="...">` (only inline or `data:` URIs allowed)
 *  - bundle size below 200 KB (sanity ceiling)
 *  - contains the canonical postMessage listener (MCP App lifecycle hook)
 *
 * Used by `pnpm --filter @canna/ui-apps build:check` and the gated vitest
 * integration test in `src/__tests__/build-output.spec.ts`.
 */

import { readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..");
const DIST = resolve(ROOT, "dist");

export const BUNDLES = [
  "member-quota-card",
  "traceability-timeline",
  "dispensation-form",
  "member-lifecycle-board",
];

export const MAX_BYTES = 200 * 1024;

const LINK_STYLESHEET_RE =
  /<link\b[^>]*\brel\s*=\s*["']?stylesheet["']?[^>]*\bhref\s*=/i;
// Matches `<script ... src="...">` with any URL that is NOT a data: URI.
const EXTERNAL_SCRIPT_RE =
  /<script\b[^>]*\bsrc\s*=\s*["'](?!data:)[^"']+["']/i;
const POSTMESSAGE_RE = /window\s*\.\s*addEventListener\s*\(\s*["']message["']/;

/**
 * @param {string} slug
 * @param {string} html
 * @returns {string[]} list of violation messages (empty = OK)
 */
const auditOne = (slug, html) => {
  const errs = [];
  if (LINK_STYLESHEET_RE.test(html)) {
    errs.push(`external <link rel="stylesheet" href=...> present`);
  }
  if (EXTERNAL_SCRIPT_RE.test(html)) {
    errs.push(`external <script src=...> present (only inline/data: allowed)`);
  }
  if (!POSTMESSAGE_RE.test(html)) {
    errs.push(
      `missing canonical postMessage listener (window.addEventListener("message", ...))`,
    );
  }
  const size = Buffer.byteLength(html, "utf8");
  if (size > MAX_BYTES) {
    errs.push(
      `bundle size ${size} bytes exceeds ceiling ${MAX_BYTES} (${(
        size / 1024
      ).toFixed(1)} KB > 200 KB)`,
    );
  }
  return errs;
};

/**
 * @typedef {{ slug: string; path: string; sizeBytes: number; ok: boolean; violations: string[] }} BundleReport
 */

/**
 * Audit all bundles. Throws nothing; returns reports for caller to decide.
 *
 * @param {{ distDir?: string; bundles?: readonly string[] }} [opts]
 * @returns {BundleReport[]}
 */
export const auditBundles = (opts = {}) => {
  const distDir = opts.distDir ?? DIST;
  const bundles = opts.bundles ?? BUNDLES;
  /** @type {BundleReport[]} */
  const reports = [];
  for (const slug of bundles) {
    const path = resolve(distDir, `${slug}.html`);
    let exists = false;
    let size = 0;
    try {
      const st = statSync(path);
      exists = st.isFile();
      size = st.size;
    } catch {
      exists = false;
    }
    if (!exists) {
      reports.push({
        slug,
        path,
        sizeBytes: 0,
        ok: false,
        violations: [`bundle file missing at ${path}`],
      });
      continue;
    }
    const html = readFileSync(path, "utf8");
    const violations = auditOne(slug, html);
    reports.push({
      slug,
      path,
      sizeBytes: size,
      ok: violations.length === 0,
      violations,
    });
  }
  return reports;
};

const isDirectRun = () => {
  if (!process.argv[1]) return false;
  try {
    return (
      resolve(process.argv[1]) === fileURLToPath(import.meta.url) ||
      process.argv[1].endsWith("verify-bundles.mjs")
    );
  } catch {
    return false;
  }
};

if (isDirectRun()) {
  const reports = auditBundles();
  let failed = 0;
  for (const r of reports) {
    const sizeKb = (r.sizeBytes / 1024).toFixed(1);
    if (r.ok) {
      console.log(`OK   ${r.slug.padEnd(24)} ${sizeKb.padStart(6)} KB  ${r.path}`);
    } else {
      failed += 1;
      console.error(`FAIL ${r.slug}`);
      for (const v of r.violations) console.error(`     - ${v}`);
    }
  }
  if (failed > 0) {
    console.error(
      `\nverify-bundles: ${failed}/${reports.length} bundle(s) failed audit`,
    );
    process.exit(1);
  }
  console.log(`\nverify-bundles: ${reports.length} bundle(s) OK`);
}
