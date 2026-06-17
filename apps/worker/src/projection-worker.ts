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
 * ─── GLOBAL REPLAY (wired) ───────────────────────────────────────────────────
 * `CannaEventStore` only exposes per-stream reads (`readStream(streamId)`), so
 * a full-replay projector needs a global enumerator. That is now provided by
 * `@canna/event-store` `createPostgresEventReader` / `readAllEvents`, which
 * reads Emmett's `emt_messages` table (default partition, committed,
 * non-archived) ordered by `(transaction_id, global_position)` and maps each
 * row back to a `DomainEvent`. `runProjectionPass()` chains:
 *   readAllEvents()  ->  applyEventsToPg(events)
 * It is a FULL idempotent fold (re-running = no-op; quota SET-not-add; audit
 * deduped by deterministic v5 UUID), so it is safe to call on an interval. The
 * event reader and read-model projector share the SAME `DATABASE_URL`.
 *
 * Replay cadence: a pass runs once on boot, then every `PROJECTION_INTERVAL_MS`
 * (default 5000ms; set to 0 to disable the timer and run only on boot).
 */
import http from "node:http";
import {
  createPgProjectorFromConnectionString,
} from "@canna/read-models";
import { createPostgresEventReader } from "@canna/event-store";

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
  const reader = await createPostgresEventReader(databaseUrl);

  /**
   * Full idempotent replay: enumerate every committed event, fold it into the
   * read-model tables. Re-running is a no-op (proven in
   * `@canna/read-models` `pg-projector.spec.ts` and the event->projection->query
   * e2e in `@canna/event-store` `loop-e2e.spec.ts`).
   */
  const runProjectionPass = async (): Promise<void> => {
    const events = await reader.readAllEvents();
    await projector.applyEventsToPg(events);
  };

  const intervalMs = Number(env("PROJECTION_INTERVAL_MS") ?? "5000");
  let timer: NodeJS.Timeout | undefined;
  const tick = (): void => {
    runProjectionPass().catch((err) => {
      process.stderr.write(`projection pass failed: ${String(err)}\n`);
    });
  };
  // Run once on boot, then on an interval (unless disabled with 0).
  tick();
  if (intervalMs > 0) {
    timer = setInterval(tick, intervalMs);
    timer.unref();
  }

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
    if (timer !== undefined) clearInterval(timer);
    httpServer.close();
    await projector.close();
    await reader.close();
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
