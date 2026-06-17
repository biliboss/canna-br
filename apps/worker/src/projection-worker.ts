/**
 * canna-projection-worker entrypoint — read-model applier.
 *
 * Reads the Emmett event log and APPLIES projections into the Postgres
 * read-model tables (members/prescriptions/member_quota/inventory_lots/
 * dispensations/audit_log) so the MCP query tools have data to read.
 *
 * Distinct from the side-effect worker (`server.ts`): that one fans
 * `DispensationRecorded` into BullMQ queues (email/SNGPC/PDF) and NEVER writes
 * the read model. This one is the missing projection-applier half — it only
 * writes the read-model tables, never the event store, never the queues.
 *
 * Idempotency: `applyEventsToPg` folds the full event log into a fresh store
 * and upserts by PK / SETs the quota accumulator / dedupes audit_log by a
 * deterministic v5 UUID — re-running is a no-op. See
 * `@canna/read-models` `pg-projector.ts` + its pglite spec.
 *
 * Health: GET /health → 200 on `PORT` (default 3003).
 *
 * ─── RUNTIME GAP (TODO) ──────────────────────────────────────────────────────
 * `CannaEventStore` only exposes per-stream reads (`readStream(streamId)`); it
 * has NO global "read all events" surface. A full-replay projector needs to
 * enumerate every event across every stream in emission order. That global
 * reader is NOT yet implemented here. To run against prod you must add ONE of:
 *   (a) a `readAllEvents()` method on the event store that reads Emmett's
 *       `emt_messages` table ordered by `global_position`, mapping each row
 *       back to a `DomainEvent` (type, streamId from metadata.cannaStreamId,
 *       occurredAt from metadata.occurredAt, payload from data); OR
 *   (b) an Emmett projection/subscription hook (consumer with a stored
 *       checkpoint) that pushes events to `applyEventsToPg` incrementally —
 *       note incremental mode needs the persisted audit guard, not fold-from-
 *       empty, for the quota accumulator.
 * Until then this worker boots healthy and exposes the wired projector via
 * `runProjectionPass(events)` but performs no automatic replay on its own.
 */
import http from "node:http";
import type { DomainEvent } from "@canna/shared";
import { createPgProjectorFromConnectionString } from "@canna/read-models";

const env = (k: string): string | undefined => process.env[k];

const main = async (): Promise<void> => {
  const databaseUrl = env("DATABASE_URL");
  if (databaseUrl === undefined || databaseUrl.length === 0) {
    process.stderr.write("FATAL: DATABASE_URL not set\n");
    process.exit(1);
  }

  const port = Number(env("PORT") ?? "3003");
  const host = env("HOST") ?? "0.0.0.0";

  const projector = await createPgProjectorFromConnectionString(databaseUrl);

  /**
   * Apply a concrete, ordered event batch to the read model. This is the wired
   * seam the global reader (TODO above) will call once enumeration lands; it is
   * already idempotent and integration-tested via pglite.
   */
  const runProjectionPass = async (
    events: readonly DomainEvent<string, unknown>[],
  ): Promise<void> => {
    await projector.applyEventsToPg(events);
  };
  void runProjectionPass; // exposed for the global reader / tests; no auto-replay yet

  const httpServer = http.createServer((req, res) => {
    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({ ok: true, name: "canna-projection-worker", version: "0.1.0" }),
      );
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "NOT_FOUND" }));
  });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    process.stderr.write(`canna-projection-worker shutdown signal=${signal}\n`);
    httpServer.close();
    await projector.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  httpServer.listen(port, host, () => {
    process.stderr.write(
      `canna-projection-worker listening on http://${host}:${String(port)} (health)\n`,
    );
  });
};

main().catch((err) => {
  process.stderr.write(`canna-projection-worker boot failed: ${String(err)}\n`);
  if (err instanceof Error && err.stack !== undefined) {
    process.stderr.write(`${err.stack}\n`);
  }
  process.exit(1);
});
