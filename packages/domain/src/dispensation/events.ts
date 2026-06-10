import type { DomainEvent, QuantityGrams, ULID } from "@canna/shared";

export type DispensationRecorded = DomainEvent<
  "DispensationRecorded",
  {
    readonly dispensationId: ULID;
    readonly associationId: ULID;
    readonly memberRef: ULID;
    readonly inventoryLotRef: ULID;
    readonly prescriptionRef: ULID;
    readonly quantityG: QuantityGrams;
    readonly dispensedBy: ULID;
    readonly approvedBy: ULID | null;
  }
>;

export type MemberQuotaConsumed = DomainEvent<
  "MemberQuotaConsumed",
  {
    readonly memberId: ULID;
    readonly dispensationId: ULID;
    readonly month: string;
    readonly quantityG: QuantityGrams;
    readonly quotaBeforeG: QuantityGrams;
    readonly quotaAfterG: QuantityGrams;
    readonly consumedBy: ULID;
  }
>;

export type LotQuantityDeductedByDispensation = DomainEvent<
  "LotQuantityDeducted",
  {
    readonly lotId: ULID;
    readonly dispensationId: ULID;
    readonly quantityG: QuantityGrams;
    readonly quantityBeforeG: QuantityGrams;
    readonly quantityAfterG: QuantityGrams;
    readonly deductedBy: ULID;
  }
>;

export type QuotaExceededAttempt = DomainEvent<
  "QuotaExceededAttempt",
  {
    readonly memberId: ULID;
    readonly month: string;
    readonly attemptedQuantityG: QuantityGrams;
    readonly quotaRemainingG: QuantityGrams;
    readonly attemptedBy: ULID;
  }
>;

export type LotInsufficientForDispensation = DomainEvent<
  "LotInsufficientQuantity",
  {
    readonly lotId: ULID;
    readonly attemptedQuantityG: QuantityGrams;
    readonly lotRemainingG: QuantityGrams;
    readonly attemptedBy: ULID;
  }
>;

export type DispensationEvent =
  | DispensationRecorded
  | MemberQuotaConsumed
  | LotQuantityDeductedByDispensation
  | QuotaExceededAttempt
  | LotInsufficientForDispensation;
