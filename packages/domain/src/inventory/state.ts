import type { QuantityGrams, ULID } from "@canna/shared";

export type LotStatus =
  | "EMPTY"
  | "QUARANTINED"
  | "AVAILABLE"
  | "EXHAUSTED"
  | "RECALLED";

export interface LotState {
  readonly status: LotStatus;
  readonly lotId: ULID | null;
  readonly associationId: ULID | null;
  readonly productSku: string | null;
  readonly quantityG: QuantityGrams | null;
  readonly expiresAt: Date | null;
}

export const emptyLotState: LotState = {
  status: "EMPTY",
  lotId: null,
  associationId: null,
  productSku: null,
  quantityG: null,
  expiresAt: null,
};
