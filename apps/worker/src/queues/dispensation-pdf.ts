import type {
  DispensationPdfJob,
  DispensationPdfResult,
  WorkerAuditSink,
} from "./types.js";

export interface DispensationPdfProcessorDeps {
  readonly audit?: WorkerAuditSink;
  readonly now?: () => Date;
}

/**
 * Stub processor for the `dispensation-pdf` queue.
 *
 * v0.2 spike returns a deterministic placeholder path. Real Puppeteer-based
 * PDF generation (with the association letterhead + member receipt) lands
 * in v0.3 per `ROADMAP.md`.
 */
export const createDispensationPdfProcessor = (
  deps: DispensationPdfProcessorDeps = {},
) => {
  const audit = deps.audit ?? (() => {});
  const now = deps.now ?? (() => new Date());

  return async (job: DispensationPdfJob): Promise<DispensationPdfResult> => {
    audit({
      queue: "dispensation-pdf",
      dispensationId: job.dispensationId,
      outcome: "ok",
      detail: "stub processor (v0.3 will wire Puppeteer)",
      at: now(),
    });
    return { pdfPath: "stub.pdf" };
  };
};
