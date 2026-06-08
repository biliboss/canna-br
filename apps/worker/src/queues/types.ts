/**
 * Job payload contracts for the three async side-effect queues fanned out
 * after a `DispensationRecorded` event. None of these jobs may mutate the
 * canonical event store — failure is observable but never invalidates the
 * dispensation that was already atomically committed (ADR-001 INV-D2).
 */

export interface SngpcSubmissionJob {
  readonly dispensationId: string;
  readonly associationId: string;
  readonly associationCNPJ: string;
  readonly dispensingEntityCode: string;
}

export interface DispensationPdfJob {
  readonly dispensationId: string;
  readonly associationId: string;
}

export interface MemberEmailJob {
  readonly dispensationId: string;
  readonly memberId: string;
  readonly associationId: string;
}

export interface SngpcSubmissionResult {
  readonly protocolNumber: string;
}

export interface DispensationPdfResult {
  readonly pdfPath: string;
}

export interface MemberEmailResult {
  readonly delivered: boolean;
}

/**
 * Minimal queue surface used by the worker. Real BullMQ instances satisfy
 * this shape via `Queue#add` / `Worker` callbacks; the in-memory test queue
 * in `__tests__` satisfies the same shape without touching Redis.
 */
export interface QueueLike<TPayload, TResult> {
  /** Enqueue a job. Returns the assigned id once accepted by the backend. */
  add(name: string, payload: TPayload): Promise<{ readonly id: string }>;
  /**
   * Subscribe a processor. Calling `add` after this MUST eventually invoke
   * the processor (in-memory queues do this synchronously; BullMQ via Redis).
   */
  process(handler: (payload: TPayload) => Promise<TResult>): void;
}

export interface CannaQueues {
  readonly sngpcSubmission: QueueLike<SngpcSubmissionJob, SngpcSubmissionResult>;
  readonly dispensationPdf: QueueLike<DispensationPdfJob, DispensationPdfResult>;
  readonly memberEmail: QueueLike<MemberEmailJob, MemberEmailResult>;
}

/** Observable audit log entry — never persisted in the event store. */
export interface WorkerAuditEntry {
  readonly queue: "sngpc-submission" | "dispensation-pdf" | "member-email";
  readonly dispensationId: string;
  readonly outcome: "ok" | "error";
  readonly detail: string;
  readonly at: Date;
}

export type WorkerAuditSink = (entry: WorkerAuditEntry) => void;
