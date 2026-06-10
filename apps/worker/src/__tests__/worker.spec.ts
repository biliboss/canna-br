import { describe, expect, it } from "vitest";
import {
  event,
  isOk,
  quantityGrams,
  type DomainEvent,
  type QuantityGrams,
  type ULID,
} from "@canna/shared";
import { createInMemoryEventStore } from "@canna/event-store";
import type { Dispensation } from "@canna/domain";
import { submitMockSngpc } from "@canna/sngpc";
import {
  createCannaWorker,
  dispatchDispensationSideEffects,
} from "../index.js";
import type {
  CannaQueues,
  DispensationPdfJob,
  DispensationPdfResult,
  MemberEmailJob,
  MemberEmailResult,
  QueueLike,
  SngpcSubmissionJob,
  SngpcSubmissionResult,
  WorkerAuditEntry,
} from "../queues/types.js";

// ---------- helpers ---------------------------------------------------------

const grams = (n: number): QuantityGrams => {
  const r = quantityGrams(n);
  if (!isOk(r)) throw new Error("grams");
  return r.value;
};

const id = (s: string): ULID => s as ULID;

const sampleEvent = (): Dispensation.DispensationRecorded => {
  const payload: Dispensation.DispensationRecorded["payload"] = {
    dispensationId: id("01J0DSP0000000000000000001"),
    associationId: id("01J0ASSOC00000000000000001"),
    memberRef: id("01J0MEMBER0000000000000001"),
    inventoryLotRef: id("01J0LOT00000000000000000001"),
    prescriptionRef: id("01J0PRESC000000000000000001"),
    quantityG: grams(3.0),
    dispensedBy: id("01J0USER000000000000000001"),
    approvedBy: id("01J0USER000000000000000002"),
  };
  return event(
    "DispensationRecorded",
    `association:${payload.associationId}:dispensations`,
    new Date("2026-06-08T15:00:00.000Z"),
    payload,
  ) as DomainEvent<"DispensationRecorded", typeof payload>;
};

/**
 * Synchronous in-memory queue shim. Mirrors the contract a real BullMQ
 * `Queue`/`Worker` pair offers but skips Redis entirely. Integration tests
 * that exercise the real BullMQ wiring live in
 * `apps/worker/src/__tests__/integration.int.spec.ts` (deferred to v0.3
 * once Redis is part of the test compose stack).
 */
interface MemoryQueue<TPayload, TResult> extends QueueLike<TPayload, TResult> {
  readonly enqueued: Array<{ id: string; payload: TPayload }>;
  readonly succeeded: Array<{ id: string; result: TResult }>;
  readonly failed: Array<{ id: string; error: string }>;
}

const createMemoryQueue = <TPayload, TResult>(): MemoryQueue<TPayload, TResult> => {
  let seq = 0;
  let handler: ((payload: TPayload) => Promise<TResult>) | undefined;
  const pending: Array<{ id: string; payload: TPayload }> = [];
  const enqueued: Array<{ id: string; payload: TPayload }> = [];
  const succeeded: Array<{ id: string; result: TResult }> = [];
  const failed: Array<{ id: string; error: string }> = [];

  const drain = async (): Promise<void> => {
    if (handler === undefined) return;
    while (pending.length > 0) {
      const next = pending.shift();
      if (next === undefined) break;
      try {
        const result = await handler(next.payload);
        succeeded.push({ id: next.id, result });
      } catch (e) {
        failed.push({
          id: next.id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  };

  return {
    enqueued,
    succeeded,
    failed,
    add: async (_name, payload) => {
      seq += 1;
      const idStr = `mem-${String(seq)}`;
      const job = { id: idStr, payload };
      enqueued.push(job);
      pending.push(job);
      // Async drain so `add` itself stays fast — caller awaits via
      // `await Promise.resolve()` or the test helper below.
      void drain();
      return { id: idStr };
    },
    process: (h) => {
      handler = h;
      // Drain anything already enqueued before `process` was wired.
      void drain();
    },
  };
};

const flush = async (): Promise<void> => {
  // Two microtask hops cover: add() → drain() → handler resolution.
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const buildQueues = (): {
  queues: CannaQueues;
  sngpc: MemoryQueue<SngpcSubmissionJob, SngpcSubmissionResult>;
  pdf: MemoryQueue<DispensationPdfJob, DispensationPdfResult>;
  email: MemoryQueue<MemberEmailJob, MemberEmailResult>;
} => {
  const sngpc = createMemoryQueue<SngpcSubmissionJob, SngpcSubmissionResult>();
  const pdf = createMemoryQueue<DispensationPdfJob, DispensationPdfResult>();
  const email = createMemoryQueue<MemberEmailJob, MemberEmailResult>();
  const queues: CannaQueues = {
    sngpcSubmission: sngpc,
    dispensationPdf: pdf,
    memberEmail: email,
  };
  return { queues, sngpc, pdf, email };
};

// ---------- tests -----------------------------------------------------------

describe("createCannaWorker — sngpc-submission processor", () => {
  it("builds XML + submits + logs protocolNumber on a recorded dispensation", async () => {
    const store = createInMemoryEventStore();
    const recorded = sampleEvent();
    await store.appendToStream(recorded.streamId, [recorded], "none");

    const audit: WorkerAuditEntry[] = [];
    const { queues, sngpc } = buildQueues();

    const worker = createCannaWorker({
      store,
      queues,
      sngpcAdapter: submitMockSngpc,
      audit: (e) => audit.push(e),
    });
    worker.start();

    await queues.sngpcSubmission.add("submit", {
      dispensationId: recorded.payload.dispensationId,
      associationId: recorded.payload.associationId,
      associationCNPJ: "00.000.000/0001-00",
      dispensingEntityCode: "ENT-1",
    });

    await flush();

    expect(sngpc.succeeded.length).toBe(1);
    expect(sngpc.failed.length).toBe(0);
    const first = sngpc.succeeded[0];
    expect(first).toBeDefined();
    if (first !== undefined) {
      expect(first.result.protocolNumber).toMatch(/^MOCK-SNGPC-/);
    }

    const okEntries = audit.filter(
      (e) => e.queue === "sngpc-submission" && e.outcome === "ok",
    );
    expect(okEntries.length).toBe(1);
  });

  it("marks job failed when sngpc adapter fails — event store untouched", async () => {
    const store = createInMemoryEventStore();
    const recorded = sampleEvent();
    await store.appendToStream(recorded.streamId, [recorded], "none");

    const audit: WorkerAuditEntry[] = [];
    const { queues, sngpc } = buildQueues();

    const worker = createCannaWorker({
      store,
      queues,
      sngpcAdapter: (xml) => submitMockSngpc(xml, { failProbability: 1 }),
      audit: (e) => audit.push(e),
    });
    worker.start();

    await queues.sngpcSubmission.add("submit", {
      dispensationId: recorded.payload.dispensationId,
      associationId: recorded.payload.associationId,
      associationCNPJ: "00.000.000/0001-00",
      dispensingEntityCode: "ENT-1",
    });

    await flush();

    expect(sngpc.failed.length).toBe(1);
    expect(sngpc.succeeded.length).toBe(0);

    const errorEntries = audit.filter(
      (e) => e.queue === "sngpc-submission" && e.outcome === "error",
    );
    expect(errorEntries.length).toBe(1);

    // Critical regulatory invariant: worker MUST NOT mutate event store.
    const { events: after } = await store.readStream(recorded.streamId);
    expect(after.length).toBe(1);
  });
});

describe("dispatchDispensationSideEffects", () => {
  it("enqueues exactly 3 jobs (sngpc + pdf + email) per recorded dispensation", async () => {
    const recorded = sampleEvent();
    const { queues, sngpc, pdf, email } = buildQueues();

    const result = await dispatchDispensationSideEffects(queues, recorded, {
      associationCNPJ: "00.000.000/0001-00",
      dispensingEntityCode: "ENT-1",
      memberId: recorded.payload.memberRef,
    });

    expect(result.sngpcJobId).toMatch(/^mem-/);
    expect(result.pdfJobId).toMatch(/^mem-/);
    expect(result.emailJobId).toMatch(/^mem-/);

    expect(sngpc.enqueued.length).toBe(1);
    expect(pdf.enqueued.length).toBe(1);
    expect(email.enqueued.length).toBe(1);

    const sngpcJob = sngpc.enqueued[0];
    expect(sngpcJob).toBeDefined();
    if (sngpcJob !== undefined) {
      expect(sngpcJob.payload.dispensationId).toBe(
        recorded.payload.dispensationId,
      );
      expect(sngpcJob.payload.associationId).toBe(
        recorded.payload.associationId,
      );
    }
  });
});
