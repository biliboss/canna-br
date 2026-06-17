/**
 * `pnpm db:seed` — populate a local read-model database with deterministic data.
 *
 * Targets a real Postgres via DATABASE_URL (full-replay, idempotent: re-running
 * does not duplicate). For the determinism PROOF against an ephemeral engine see
 * `packages/read-models/src/__tests__/seed.spec.ts` (pglite, in-process query).
 *
 *   DATABASE_URL=postgres://... pnpm db:seed
 *
 * Assumes the schema is already applied (`pnpm db:migrate`).
 */
import { createPgProjectorFromConnectionString } from "@canna/read-models";
import { buildSeedEvents } from "@canna/test-utils";

const main = async (): Promise<void> => {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    console.error(
      "✗ DATABASE_URL not set. Example:\n" +
        "  DATABASE_URL=postgres://localhost:5432/canna pnpm db:seed",
    );
    process.exit(1);
  }
  const events = buildSeedEvents();
  const projector = await createPgProjectorFromConnectionString(url);
  try {
    await projector.applyEventsToPg(events);
    console.log(
      `✓ seeded ${String(events.length)} events (idempotent full-replay)`,
    );
  } finally {
    await projector.close();
  }
};

main().catch((err: unknown) => {
  console.error("✗ seed failed:", err);
  process.exit(1);
});
