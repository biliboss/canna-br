import type { Dispensation } from "@canna/domain";
import type { CannaQueues } from "../queues/types.js";

/**
 * Context an upstream caller (e.g. `apps/api` after `recordDispensation`)
 * must provide alongside the freshly recorded event so the worker can
 * build a SNGPC XML envelope without re-loading the association aggregate.
 */
export interface DispensationSideEffectsContext {
  readonly associationCNPJ: string;
  readonly dispensingEntityCode: string;
  readonly memberId: string;
}

export interface DispatchResult {
  readonly sngpcJobId: string;
  readonly pdfJobId: string;
  readonly emailJobId: string;
}

/**
 * Fan out a `DispensationRecorded` event into the three async side-effect
 * queues. Called by `apps/api` after a successful `recordDispensation`, or
 * by an event-store subscription/projection in production.
 *
 * Always enqueues all three jobs — partial enqueue would leave us in a
 * state where the dispensation is committed but a side effect is missing
 * with no audit trail.
 */
export const dispatchDispensationSideEffects = async (
  queues: CannaQueues,
  recorded: Dispensation.DispensationRecorded,
  context: DispensationSideEffectsContext,
): Promise<DispatchResult> => {
  const { dispensationId, associationId, memberRef } = recorded.payload;

  const [sngpc, pdf, email] = await Promise.all([
    queues.sngpcSubmission.add("submit", {
      dispensationId,
      associationId,
      associationCNPJ: context.associationCNPJ,
      dispensingEntityCode: context.dispensingEntityCode,
    }),
    queues.dispensationPdf.add("render", {
      dispensationId,
      associationId,
    }),
    queues.memberEmail.add("notify", {
      dispensationId,
      memberId: context.memberId.length > 0 ? context.memberId : memberRef,
      associationId,
    }),
  ]);

  return {
    sngpcJobId: sngpc.id,
    pdfJobId: pdf.id,
    emailJobId: email.id,
  };
};
