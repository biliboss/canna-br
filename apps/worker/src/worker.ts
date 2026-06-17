import type { CannaEventStore } from "@canna/event-store";
import type { MockSngpcAdapter } from "@canna/sngpc";
import {
  createSngpcSubmissionProcessor,
  type SngpcProcessorDeps,
} from "./queues/sngpc-submission.js";
import { createDispensationPdfProcessor } from "./queues/dispensation-pdf.js";
import { createMemberEmailProcessor } from "./queues/member-email.js";
import type {
  CannaQueues,
  WorkerAuditSink,
  SngpcSubmissionJob,
  SngpcSubmissionResult,
  DispensationPdfJob,
  DispensationPdfResult,
  MemberEmailJob,
  MemberEmailResult,
} from "./queues/types.js";

export interface CreateCannaWorkerDeps {
  readonly store: CannaEventStore;
  readonly queues: CannaQueues;
  readonly sngpcAdapter: MockSngpcAdapter;
  readonly redisUrl?: string;
  readonly audit?: WorkerAuditSink;
  readonly now?: () => Date;
}

export interface CannaWorker {
  readonly start: () => void;
  readonly stop: () => Promise<void>;
  readonly processors: {
    readonly sngpcSubmission: (
      job: SngpcSubmissionJob,
    ) => Promise<SngpcSubmissionResult>;
    readonly dispensationPdf: (
      job: DispensationPdfJob,
    ) => Promise<DispensationPdfResult>;
    readonly memberEmail: (
      job: MemberEmailJob,
    ) => Promise<MemberEmailResult>;
  };
}

/**
 * Build the canna-oss async worker.
 *
 * The worker owns the three side-effect queues fanned out after every
 * `DispensationRecorded` event:
 *   - `sngpc-submission`   → ANVISA XML submission (real adapter v0.5)
 *   - `dispensation-pdf`   → PDF receipt rendering  (real impl v0.3)
 *   - `member-email`       → member notification    (real impl v0.3)
 *
 * Queues are injected so unit tests can run against an in-memory shim
 * without spinning Redis. Production wiring binds these to real BullMQ
 * `Queue` instances connected to the Redis from `ops/openwebui/docker-compose.yml`.
 */
export const createCannaWorker = (deps: CreateCannaWorkerDeps): CannaWorker => {
  const sngpcDeps: SngpcProcessorDeps = {
    store: deps.store,
    sngpcAdapter: deps.sngpcAdapter,
    ...(deps.audit !== undefined ? { audit: deps.audit } : {}),
    ...(deps.now !== undefined ? { now: deps.now } : {}),
  };

  const pdfDeps = {
    ...(deps.audit !== undefined ? { audit: deps.audit } : {}),
    ...(deps.now !== undefined ? { now: deps.now } : {}),
  };

  const emailDeps = {
    ...(deps.audit !== undefined ? { audit: deps.audit } : {}),
    ...(deps.now !== undefined ? { now: deps.now } : {}),
  };

  const sngpcSubmission = createSngpcSubmissionProcessor(sngpcDeps);
  const dispensationPdf = createDispensationPdfProcessor(pdfDeps);
  const memberEmail = createMemberEmailProcessor(emailDeps);

  let started = false;

  // Entry-point trace for jobs: time each processor, emit one structured span
  // per job (queue, latency, ok). level=error on failure so log pipelines can
  // alert. Best-effort — the span emit is wrapped and never alters job control
  // flow (errors re-throw so BullMQ retry/DLQ still triggers). Mirrors the MCP
  // host's per-tool span.
  const traced =
    <J, R>(queue: string, fn: (job: J) => Promise<R>) =>
    (job: J): Promise<R> => {
      const start = Date.now();
      const emit = (ok: boolean, error?: string): void => {
        try {
          process.stderr.write(
            `${JSON.stringify({
              kind: "worker.job.span",
              level: ok ? "info" : "error",
              queue,
              latencyMs: Date.now() - start,
              ok,
              error,
              ts: new Date().toISOString(),
            })}\n`,
          );
        } catch {
          /* telemetry must never break a job */
        }
      };
      // Run fn, return its promise UNCHANGED to the queue (the span observer is
      // attached to a separate branch so it adds zero microtask hops to the
      // job's own resolution path — the processor behaves byte-identically to
      // the unwrapped fn). Best-effort, never alters control flow.
      const p = fn(job);
      void p.then(
        () => emit(true),
        (e: unknown) => emit(false, e instanceof Error ? e.message : String(e)),
      );
      return p;
    };

  const start = (): void => {
    if (started) return;
    deps.queues.sngpcSubmission.process(traced("sngpc-submission", sngpcSubmission));
    deps.queues.dispensationPdf.process(traced("dispensation-pdf", dispensationPdf));
    deps.queues.memberEmail.process(traced("member-email", memberEmail));
    started = true;
  };

  const stop = async (): Promise<void> => {
    // In v0.2 spike the in-memory queue has no teardown. Real BullMQ
    // `Worker#close()` calls happen here once `apps/worker/src/redis.ts`
    // lands alongside the v0.5 SNGPC adapter.
    started = false;
    await Promise.resolve();
  };

  return {
    start,
    stop,
    processors: {
      sngpcSubmission,
      dispensationPdf,
      memberEmail,
    },
  };
};
