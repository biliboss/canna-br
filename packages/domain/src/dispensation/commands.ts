import type { QuantityGrams, ULID } from "@canna/shared";

/**
 * Step 1 of the RDC 1.014 two-step gate: a DISPENSADOR *requests* a
 * dispensation. This does NOT consume quota or deduct inventory — it merely
 * records a pending action awaiting approval by a DISTINCT approver
 * (RESPONSAVEL_TECNICO | DIRETORIA). Segregation of duties is enforced at
 * approval time by comparing requester identity (recovered from the stored
 * `DispensationRequested` event) against the approver.
 */
export interface RequestDispensation {
  readonly type: "RequestDispensation";
  readonly dispensationId: ULID;
  readonly associationId: ULID;
  readonly memberId: ULID;
  readonly lotId: ULID;
  readonly quantityG: QuantityGrams;
  readonly requestedBy: ULID;
  readonly now: Date;
}

/**
 * Step 2 of the gate: a distinct approver effects a previously-requested
 * dispensation. Only `dispensationId` + `approvedBy` are approver-supplied;
 * member/lot/quantity/requester are recovered from the stored request event so
 * an approver cannot tamper with the original request. Quota + inventory are
 * validated HERE (at effect time), reusing the same logic as the legacy
 * direct-record path.
 */
export interface ApproveDispensation {
  readonly type: "ApproveDispensation";
  readonly dispensationId: ULID;
  readonly associationId: ULID;
  readonly approvedBy: ULID;
  readonly now: Date;
}

/**
 * Legacy direct-record command — retained for the pure decider so existing
 * unit scenarios keep exercising the effect logic in isolation. The MCP write
 * surface now routes through Request → Approve instead of emitting this
 * directly.
 */
export interface RecordDispensation {
  readonly type: "RecordDispensation";
  readonly dispensationId: ULID;
  readonly associationId: ULID;
  readonly memberId: ULID;
  readonly lotId: ULID;
  readonly quantityG: QuantityGrams;
  readonly dispensedBy: ULID;
  readonly approvedBy: ULID | null;
  readonly now: Date;
}

export type DispensationCommand =
  | RequestDispensation
  | ApproveDispensation
  | RecordDispensation;
