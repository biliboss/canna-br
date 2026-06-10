import type {
  MemberEmailJob,
  MemberEmailResult,
  WorkerAuditSink,
} from "./types.js";

export interface MemberEmailProcessorDeps {
  readonly audit?: WorkerAuditSink;
  readonly now?: () => Date;
}

/**
 * Stub processor for the `member-email` queue.
 *
 * v0.2 spike returns `{ delivered: true }`. Real SES/Resend wiring lands
 * in v0.3 per `ROADMAP.md`.
 */
export const createMemberEmailProcessor = (
  deps: MemberEmailProcessorDeps = {},
) => {
  const audit = deps.audit ?? (() => {});
  const now = deps.now ?? (() => new Date());

  return async (job: MemberEmailJob): Promise<MemberEmailResult> => {
    audit({
      queue: "member-email",
      dispensationId: job.dispensationId,
      outcome: "ok",
      detail: `stub email for member=${job.memberId}`,
      at: now(),
    });
    return { delivered: true };
  };
};
