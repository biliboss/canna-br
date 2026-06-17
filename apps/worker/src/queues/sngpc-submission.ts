import {
  buildDispensationSngpcXml,
  isSngpcSubmissionOk,
  validateSngpcXml,
  type MockSngpcAdapter,
} from "@canna/sngpc";
import type { CannaEventStore } from "@canna/event-store";
import { Dispensations } from "@canna/app-services";
import type { Dispensation } from "@canna/domain";
import type {
  SngpcSubmissionJob,
  SngpcSubmissionResult,
  WorkerAuditSink,
} from "./types.js";

export interface SngpcProcessorDeps {
  readonly store: CannaEventStore;
  readonly sngpcAdapter: MockSngpcAdapter;
  readonly audit?: WorkerAuditSink;
  readonly now?: () => Date;
}

const findRecorded = (
  events: ReadonlyArray<unknown>,
  dispensationId: string,
): Dispensation.DispensationRecorded | undefined => {
  for (const e of events) {
    if (
      typeof e === "object" &&
      e !== null &&
      "type" in e &&
      (e as { type: unknown }).type === "DispensationRecorded"
    ) {
      const cand = e as Dispensation.DispensationRecorded;
      if (cand.payload.dispensationId === dispensationId) {
        return cand;
      }
    }
  }
  return undefined;
};

/**
 * Build the BullMQ job processor for the `sngpc-submission` queue.
 *
 * Flow:
 *   1. Read the association dispensation stream via @canna/app-services.
 *      (Worker NEVER bypasses the service layer.)
 *   2. Locate the matching `DispensationRecorded` event by id.
 *   3. Build XML, validate, submit via injected adapter.
 *   4. On success → emit audit entry, return `{ protocolNumber }`.
 *   5. On failure → emit audit entry, throw. BullMQ retry policy
 *      (max 3, exponential backoff) handles the rest.
 *
 * IMPORTANT: this processor never appends to the event store. Regulatory
 * guarantee per ADR-001 INV-D2.
 */
export const createSngpcSubmissionProcessor = (deps: SngpcProcessorDeps) => {
  const audit = deps.audit ?? (() => {});
  const now = deps.now ?? (() => new Date());

  return async (
    job: SngpcSubmissionJob,
  ): Promise<SngpcSubmissionResult> => {
    const loaded = await Dispensations.loadAssociationDispensations(
      deps.store,
      job.associationId,
    );
    if (!loaded.ok) {
      const detail = `Failed to read association stream for ${job.dispensationId}: ${loaded.error.message}`;
      audit({
        queue: "sngpc-submission",
        dispensationId: job.dispensationId,
        outcome: "error",
        detail,
        at: now(),
      });
      throw new Error(detail);
    }
    const { events } = loaded.value;
    const recorded = findRecorded(events, job.dispensationId);
    if (recorded === undefined) {
      const detail = `DispensationRecorded ${job.dispensationId} not found in association:${job.associationId}`;
      audit({
        queue: "sngpc-submission",
        dispensationId: job.dispensationId,
        outcome: "error",
        detail,
        at: now(),
      });
      throw new Error(detail);
    }

    const xml = buildDispensationSngpcXml(recorded, {
      associationCNPJ: job.associationCNPJ,
      dispensingEntityCode: job.dispensingEntityCode,
    });

    const validated = validateSngpcXml(xml);
    if (validated.ok !== true) {
      const detail = `SNGPC XML failed local validation: ${validated.error.code}`;
      audit({
        queue: "sngpc-submission",
        dispensationId: job.dispensationId,
        outcome: "error",
        detail,
        at: now(),
      });
      throw new Error(detail);
    }

    const result = await deps.sngpcAdapter(validated.value);
    if (!isSngpcSubmissionOk(result)) {
      audit({
        queue: "sngpc-submission",
        dispensationId: job.dispensationId,
        outcome: "error",
        detail: result.error,
        at: now(),
      });
      throw new Error(`SNGPC adapter failure: ${result.error}`);
    }

    audit({
      queue: "sngpc-submission",
      dispensationId: job.dispensationId,
      outcome: "ok",
      detail: `protocolNumber=${result.protocolNumber}`,
      at: now(),
    });
    return { protocolNumber: result.protocolNumber };
  };
};
