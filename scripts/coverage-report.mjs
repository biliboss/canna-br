#!/usr/bin/env node
/**
 * `pnpm coverage:report` — run the domain coverage suite, emit a portable
 * report at `releases/coverage.json`, and GATE on a minimum line coverage.
 *
 * Used by the lefthook pre-push gate (cb-pre-push-gate-full-suite): a red /
 * sub-threshold run exits non-zero and BLOCKS the push.
 *
 * Floor rationale: baseline at introduction was 93.61% lines (domain). We gate
 * at COVERAGE_FLOOR (default 90) — a small tolerance below baseline so honest
 * refactors don't trip the gate, while a real regression (a whole untested
 * module) drops well below and blocks. Override: COVERAGE_FLOOR=92 pnpm ...
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const floor = Number(process.env.COVERAGE_FLOOR ?? "90");

// Run domain coverage with a json-summary reporter (deterministic machine read).
execFileSync(
  "pnpm",
  [
    "--filter",
    "@canna/domain",
    "exec",
    "vitest",
    "run",
    "--coverage",
    "--coverage.reporter=json-summary",
    "--coverage.reporter=text-summary",
  ],
  { cwd: root, stdio: "inherit" },
);

const summaryPath = resolve(
  root,
  "packages/domain/coverage/coverage-summary.json",
);
const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
const total = summary.total;

const report = {
  generatedAt: new Date().toISOString(),
  floor,
  package: "@canna/domain",
  lines: total.lines.pct,
  statements: total.statements.pct,
  functions: total.functions.pct,
  branches: total.branches.pct,
};

const outDir = resolve(root, "releases");
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, "coverage.json");
writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");

console.log(
  `\ncoverage report → releases/coverage.json (lines ${report.lines}%, floor ${floor}%)`,
);

if (report.lines < floor) {
  console.error(
    `✗ coverage gate: lines ${report.lines}% < floor ${floor}% — push BLOCKED`,
  );
  process.exit(1);
}
console.log(`✓ coverage gate: lines ${report.lines}% ≥ floor ${floor}%`);
