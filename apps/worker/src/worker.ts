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

  const start = (): void => {
    if (started) return;
    deps.queues.sngpcSubmission.process(sngpcSubmission);
    deps.queues.dispensationPdf.process(dispensationPdf);
    deps.queues.memberEmail.process(memberEmail);
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
