/**
 * canna-worker entrypoint — BullMQ long-running worker.
 *
 * v0.2.1.1 thin executable wrapping `createCannaWorker()` factory. Binds the
 * 3 queues (`sngpc-submission`, `dispensation-pdf`, `member-email`) to
 * concrete BullMQ `Worker` instances using `REDIS_URL`.
 *
 * Side-effects only — never mutates the event store (per ADR-001 sync/async
 * boundary). SNGPC failures retried with exponential backoff; permanent
 * failures land in DLQ via BullMQ's `failed` event.
 *
 * Health: tiny HTTP server on `PORT` (default 3002) exposing `/health`.
 */
import http from "node:http";
import { Queue, Worker } from "bullmq";
import { createPostgresEventStore } from "@canna/event-store";
import { submitMockSngpc, type MockSngpcAdapter } from "@canna/sngpc";
import { createCannaWorker } from "./worker.js";
import { DEFAULT_JOB_OPTIONS } from "./queue-config.js";
import type {
  CannaQueues,
  SngpcSubmissionJob,
  SngpcSubmissionResult,
  DispensationPdfJob,
  DispensationPdfResult,
  MemberEmailJob,
  MemberEmailResult,
  QueueLike,
} from "./queues/types.js";

const env = (k: string): string | undefined => process.env[k];

const main = async (): Promise<void> => {
  const databaseUrl = env("DATABASE_URL");
  const redisUrl = env("REDIS_URL");
  if (databaseUrl === undefined || databaseUrl.length === 0) {
    process.stderr.write("FATAL: DATABASE_URL not set\n");
    process.exit(1);
  }
  if (redisUrl === undefined || redisUrl.length === 0) {
    process.stderr.write("FATAL: REDIS_URL not set\n");
    process.exit(1);
  }

  const port = Number(env("PORT") ?? "3002");
  const host = env("HOST") ?? "0.0.0.0";

  // Pass connection string + opts directly to BullMQ — it instantiates its
  // own ioredis client internally. Avoids ioredis 5.10/5.11 type drift in
  // the pnpm tree (BullMQ pins one minor, we'd pull another otherwise).
  const url = new URL(redisUrl);
  const connection = {
    host: url.hostname,
    port: Number(url.port || "6379"),
    ...(url.password ? { password: url.password } : {}),
    ...(url.username ? { username: url.username } : {}),
    maxRetriesPerRequest: null,
  } as const;
  const store = createPostgresEventStore({ connectionString: databaseUrl });

  const failProb = Number(env("SNGPC_MOCK_FAIL_PROB") ?? "0");
  const latencyMs = Number(env("SNGPC_MOCK_LATENCY_MS") ?? "50");
  const adapter: MockSngpcAdapter = (xml, opts) =>
    submitMockSngpc(xml, { failProbability: failProb, latencyMs, ...(opts ?? {}) });

  // Real BullMQ queues backed by Redis (Queue + Worker pair per queue).
  // `defaultJobOptions` (DEFAULT_JOB_OPTIONS) gives every job 3 attempts with
  // exponential backoff (5s base) so a transient failure retries instead of
  // permanently dead-lettering a regulatory SNGPC submission. Applied
  // consistently to all three queues for durability.
  const sngpcQueue = new Queue<SngpcSubmissionJob>("sngpc-submission", {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
  const pdfQueue = new Queue<DispensationPdfJob>("dispensation-pdf", {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });
  const emailQueue = new Queue<MemberEmailJob>("member-email", {
    connection,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  });

  // BullMQ Queue → QueueLike adapter.
  //
  // `add(name, payload)` enqueues on BullMQ; returns the assigned job id.
  // `process(handler)` is intentionally a no-op here — production wires
  // processors via the dedicated BullMQ `Worker` instances below (which
  // talk to Redis directly and survive worker restarts). The CannaQueues
  // contract is satisfied so `createCannaWorker` accepts the deps.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const asQueueLike = <P, R>(q: Queue<any>): QueueLike<P, R> => ({
    add: async (name: string, payload: P) => {
      const job = await q.add(name, payload as never);
      return { id: String(job.id ?? "") };
    },
    process: () => {
      // no-op — see BullMQ Worker bindings below
    },
  });

  const queues: CannaQueues = {
    sngpcSubmission: asQueueLike<SngpcSubmissionJob, SngpcSubmissionResult>(sngpcQueue),
    dispensationPdf: asQueueLike<DispensationPdfJob, DispensationPdfResult>(pdfQueue),
    memberEmail: asQueueLike<MemberEmailJob, MemberEmailResult>(emailQueue),
  };

  const cannaWorker = createCannaWorker({
    store,
    queues,
    sngpcAdapter: adapter,
    redisUrl,
    now: () => new Date(),
  });

  const sngpcBullWorker = new Worker<SngpcSubmissionJob, SngpcSubmissionResult>(
    "sngpc-submission",
    async (job) => cannaWorker.processors.sngpcSubmission(job.data),
    { connection },
  );
  const pdfBullWorker = new Worker<DispensationPdfJob, DispensationPdfResult>(
    "dispensation-pdf",
    async (job) => cannaWorker.processors.dispensationPdf(job.data),
    { connection },
  );
  const emailBullWorker = new Worker<MemberEmailJob, MemberEmailResult>(
    "member-email",
    async (job) => cannaWorker.processors.memberEmail(job.data),
    { connection },
  );

  cannaWorker.start();

  const httpServer = http.createServer((req, res) => {
    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, name: "canna-worker", version: "0.2.1" }));
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "NOT_FOUND" }));
  });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    process.stderr.write(`canna-worker shutdown signal=${signal}\n`);
    httpServer.close();
    await Promise.allSettled([
      sngpcBullWorker.close(),
      pdfBullWorker.close(),
      emailBullWorker.close(),
      sngpcQueue.close(),
      pdfQueue.close(),
      emailQueue.close(),
    ]);
    await cannaWorker.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  httpServer.listen(port, host, () => {
    process.stderr.write(
      `canna-worker listening on http://${host}:${String(port)} (health) + redis=${redisUrl}\n`,
    );
  });
};

main().catch((err) => {
  process.stderr.write(`canna-worker boot failed: ${String(err)}\n`);
  if (err instanceof Error && err.stack !== undefined) {
    process.stderr.write(`${err.stack}\n`);
  }
  process.exit(1);
});
