import type { DomainEvent, QuantityGrams, ULID } from "@canna/shared";

export type LotCreated = DomainEvent<
  "LotCreated",
  {
    readonly lotId: ULID;
    readonly associationId: ULID;
    readonly productSku: string;
    readonly initialQuantityG: QuantityGrams;
    readonly origin: "INTERNAL_CULTIVATION" | "EXTERNAL_PURCHASE" | "DONATION";
    readonly producedAt: Date;
    readonly expiresAt: Date;
    readonly createdBy: ULID;
  }
>;

export type LotQuarantined = DomainEvent<
  "LotQuarantined",
  {
    readonly lotId: ULID;
    readonly reason: string;
    readonly quarantinedBy: ULID;
  }
>;

export type LotReleased = DomainEvent<
  "LotReleased",
  {
    readonly lotId: ULID;
    readonly coaReference: string;
    readonly releasedBy: ULID;
  }
>;

export type LotQuantityDeducted = DomainEvent<
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

export type LotRecalled = DomainEvent<
  "LotRecalled",
  {
    readonly lotId: ULID;
    readonly reason: string;
    readonly recalledBy: ULID;
  }
>;

export type LotExhausted = DomainEvent<
  "LotExhausted",
  {
    readonly lotId: ULID;
  }
>;

export type LotInsufficientQuantity = DomainEvent<
  "LotInsufficientQuantity",
  {
    readonly lotId: ULID;
    readonly attemptedQuantityG: QuantityGrams;
    readonly lotRemainingG: QuantityGrams;
    readonly attemptedBy: ULID;
  }
>;

export type InventoryEvent =
  | LotCreated
  | LotQuarantined
  | LotReleased
  | LotQuantityDeducted
  | LotRecalled
  | LotExhausted
  | LotInsufficientQuantity;
