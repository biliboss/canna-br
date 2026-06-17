/**
 * e2e-only seed runner. Lives inside apps/mcp (a workspace package whose
 * node_modules resolves BOTH @canna/read-models and its transitive `pg`) so the
 * deterministic wave.7 seed projects into the read-model tables. The root-level
 * scripts/seed.ts cannot resolve @canna/* + pg from the non-package repo root,
 * so the e2e harness invokes THIS instead.
 *
 *   DATABASE_URL=postgres://... tsx apps/mcp/src/e2e-seed-runner.ts
 */
import { createPgProjectorFromConnectionString } from "@canna/read-models";
// Import the seed builder DIRECTLY from its source module, not via the
// @canna/test-utils barrel — the barrel re-exports scenario/AgentReporter which
// pull in `vitest`, and importing vitest outside the `vitest` runner throws.
import { buildSeedEvents } from "../../../tooling/test-utils/src/seed-events.js";

const main = async (): Promise<void> => {
  const url = process.env["DATABASE_URL"];
  if (url === undefined || url.length === 0) {
    process.stderr.write("FATAL: DATABASE_URL not set\n");
    process.exit(1);
  }
  const events = buildSeedEvents();
  const projector = await createPgProjectorFromConnectionString(url);
  try {
    await projector.applyEventsToPg(events);
    process.stderr.write(
      `seeded ${String(events.length)} events (idempotent full-replay)\n`,
    );
  } finally {
    await projector.close();
  }
};

main().catch((err: unknown) => {
  process.stderr.write(`seed failed: ${String(err)}\n`);
  process.exit(1);
});
