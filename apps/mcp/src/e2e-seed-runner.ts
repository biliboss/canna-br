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
import { createPostgresEventStore } from "@canna/event-store";
// Import the seed builder via the dedicated `@canna/test-utils/seed` subpath —
// NOT the package barrel, which re-exports scenario/AgentReporter that pull in
// `vitest` (importing vitest outside the `vitest` runner throws). The subpath
// keeps tsc rootDir happy (no cross-package relative import) AND avoids vitest.
import { buildSeedEvents } from "@canna/test-utils/seed";

/**
 * Map a seed domain event to its aggregate stream id. The MCP write-path
 * deciders (e.g. recordDispensation → loadLotState) re-fold these EVENT-STORE
 * streams, so the seed must land in the event store too — not only the
 * read-model tables. member:* and lot:* match the app-service conventions
 * (member-service / inventory-service `streamId`).
 */
const streamIdFor = (e: {
  type: string;
  payload: Record<string, unknown>;
}): string | undefined => {
  const p = e.payload;
  if (typeof p["lotId"] === "string") return `lot:${p["lotId"] as string}`;
  if (typeof p["memberId"] === "string")
    return `member:${p["memberId"] as string}`;
  return undefined;
};

const main = async (): Promise<void> => {
  const url = process.env["DATABASE_URL"];
  if (url === undefined || url.length === 0) {
    process.stderr.write("FATAL: DATABASE_URL not set\n");
    process.exit(1);
  }
  const events = buildSeedEvents();

  // 1. read-model projection (powers get_members_by_status / list_available_lots)
  const projector = await createPgProjectorFromConnectionString(url);
  try {
    await projector.applyEventsToPg(events);
  } finally {
    await projector.close();
  }

  // 2. event-store append, grouped per aggregate stream (powers the write-path
  //    deciders that re-fold streams — e.g. dispensation loading the seed lot).
  //    Idempotent-ish: appends only when the stream is empty, so re-running the
  //    harness against a live pg does not duplicate the seed lot/member events.
  const store = createPostgresEventStore({ connectionString: url });
  const byStream = new Map<
    string,
    { type: string; payload: Record<string, unknown> }[]
  >();
  for (const e of events) {
    const sid = streamIdFor(e as never);
    if (sid === undefined) continue;
    const arr = byStream.get(sid) ?? [];
    arr.push(e as never);
    byStream.set(sid, arr);
  }
  for (const [sid, evs] of byStream) {
    const existing = await store.readStream(sid);
    if (existing.events.length > 0) continue; // already seeded
    await store.appendToStream(sid, evs as never);
  }
  process.stderr.write(
    `seeded ${String(events.length)} events into read-models + ${String(byStream.size)} event-store streams\n`,
  );
};

main().catch((err: unknown) => {
  process.stderr.write(`seed failed: ${String(err)}\n`);
  process.exit(1);
});
