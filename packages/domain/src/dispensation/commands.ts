import type { QuantityGrams, ULID } from "@canna/shared";

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

export type DispensationCommand = RecordDispensation;
