/**
 * Public types for the SNGPC integration package.
 *
 * The canonical ANVISA schema for patient-association dispensations is not yet
 * published (Jun 2026) — see `apps/docs/src/content/docs/research/sngpc.md`.
 * The XML envelope produced by `buildDispensationSngpcXml` is a placeholder
 * shape that mirrors the published farmácia schema with the four extra fields
 * documented in that research note (THC/CBD, plant id, COA hash, anonymous
 * member ref). Real XSD validation lands in v0.5.
 */

/** Branded validated XML string — only `validateSngpcXml` may produce one. */
export type ValidatedXml = string & { readonly __brand: "ValidatedXml" };

/** Context required to wrap a domain `DispensationRecorded` into SNGPC XML. */
export interface SngpcSubmissionContext {
  /** CNPJ of the association ("00.000.000/0001-00"). */
  readonly associationCNPJ: string;
  /** ANVISA-assigned dispensing entity code for the association. */
  readonly dispensingEntityCode: string;
}

/** Successful submission result from a SNGPC adapter. */
export interface SngpcSubmissionOk {
  readonly protocolNumber: string;
  readonly sentAt: Date;
}

/** Failure result from a SNGPC adapter — never thrown, always returned. */
export interface SngpcSubmissionError {
  readonly error: string;
}

export type SngpcSubmissionResult = SngpcSubmissionOk | SngpcSubmissionError;

export const isSngpcSubmissionOk = (
  r: SngpcSubmissionResult,
): r is SngpcSubmissionOk => "protocolNumber" in r;

/** Options for the mock ANVISA adapter (deterministic tests). */
export interface MockAdapterOptions {
  /**
   * Probability in [0, 1] that the mock returns an error.
   * `1` short-circuits to a deterministic failure.
   */
  readonly failProbability?: number;
  /** Simulated network latency in milliseconds (default 0). */
  readonly latencyMs?: number;
}
