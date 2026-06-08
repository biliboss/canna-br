import type { QuantityGrams, ULID } from "@canna/shared";

export interface CreateLot {
  readonly type: "CreateLot";
  readonly lotId: ULID;
  readonly associationId: ULID;
  readonly productSku: string;
  readonly initialQuantityG: QuantityGrams;
  readonly origin: "INTERNAL_CULTIVATION" | "EXTERNAL_PURCHASE" | "DONATION";
  readonly producedAt: Date;
  readonly expiresAt: Date;
  readonly createdBy: ULID;
  readonly now: Date;
}

export interface QuarantineLot {
  readonly type: "QuarantineLot";
  readonly lotId: ULID;
  readonly reason: string;
  readonly quarantinedBy: ULID;
  readonly now: Date;
}

export interface ReleaseLot {
  readonly type: "ReleaseLot";
  readonly lotId: ULID;
  readonly coaReference: string;
  readonly releasedBy: ULID;
  readonly now: Date;
}

export interface DeductLotQuantity {
  readonly type: "DeductLotQuantity";
  readonly lotId: ULID;
  readonly dispensationId: ULID;
  readonly quantityG: QuantityGrams;
  readonly deductedBy: ULID;
  readonly now: Date;
}

export interface RecallLot {
  readonly type: "RecallLot";
  readonly lotId: ULID;
  readonly reason: string;
  readonly recalledBy: ULID;
  readonly now: Date;
}

export type InventoryCommand =
  | CreateLot
  | QuarantineLot
  | ReleaseLot
  | DeductLotQuantity
  | RecallLot;
