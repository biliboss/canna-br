#!/usr/bin/env node
/**
 * Gate-contract self-check. Asserts lefthook.yml still declares every quality
 * gate. Exit≠0 if any is missing — this is the ANTI-FALSE-GREEN guard: removing
 * the pre-push prod smoke (or any stage/guard) turns this RED.
 *
 * Run: pnpm gates:verify  (or: node scripts/assert-gates.mjs)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const ymlPath = resolve(here, "..", "lefthook.yml");

let yml;
try {
  yml = readFileSync(ymlPath, "utf8");
} catch {
  console.error(`✗ lefthook.yml not found at ${ymlPath}`);
  process.exit(1);
}

const must = [
  ["pre-commit stage", /^pre-commit:/m],
  ["post-commit stage", /^post-commit:/m],
  ["pre-push stage", /^pre-push:/m],
  ["main-only guard", /rev-parse --abbrev-ref HEAD/],
  ["typecheck gate", /typecheck/],
  ["prod smoke (app.cannabr.org/health → 200)", /app\.cannabr\.org\/health/],
  ["e2e pre-merge gate", /test:e2e:gate/],
];

const missing = must.filter(([, re]) => !re.test(yml)).map(([name]) => name);
if (missing.length > 0) {
  console.error("✗ gate contract violated — missing:");
  for (const m of missing) console.error(`    - ${m}`);
  process.exit(1);
}
console.log(`✓ gate contract intact (${must.length} checks)`);
