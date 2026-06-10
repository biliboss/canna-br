import type { Inventory } from "@canna/domain";
import type { DomainEvent, QuantityGrams } from "@canna/shared";
import { gramsToNumber } from "@canna/shared";

import type {
  LotStatusValue,
  NewInventoryLotRow,
} from "../schema/inventory-lots.js";

const gramsToNumeric = (q: QuantityGrams): string => gramsToNumber(q).toFixed(3);

/**
 * Pure projection step for the `inventory_lots` table.
 *
 * Returns the row that should be persisted, or `null` when the event is not
 * relevant to this projection.
 */
export const projectLot = (
  state: NewInventoryLotRow | null,
  event: DomainEvent<string, unknown>,
): NewInventoryLotRow | null => {
  const typed = event as Inventory.InventoryEvent;

  switch (typed.type) {
    case "LotCreated": {
      const status: LotStatusValue = "QUARANTINED";
      const qty = gramsToNumeric(typed.payload.initialQuantityG);
      return {
        lotId: typed.payload.lotId,
        associationId: typed.payload.associationId,
        productSku: typed.payload.productSku,
        status,
        initialQuantityG: qty,
        currentQuantityG: state?.currentQuantityG ?? qty,
        producedAt: typed.payload.producedAt,
        expiresAt: typed.payload.expiresAt,
      };
    }
    case "LotQuarantined": {
      if (!state) return null;
      return { ...state, status: "QUARANTINED" satisfies LotStatusValue };
    }
    case "LotReleased": {
      if (!state) return null;
      return { ...state, status: "RELEASED" satisfies LotStatusValue };
    }
    case "LotQuantityDeducted": {
      if (!state) return null;
      return {
        ...state,
        currentQuantityG: gramsToNumeric(typed.payload.quantityAfterG),
      };
    }
    case "LotRecalled": {
      if (!state) return null;
      return { ...state, status: "RECALLED" satisfies LotStatusValue };
    }
    case "LotExhausted": {
      if (!state) return null;
      return {
        ...state,
        status: "EXHAUSTED" satisfies LotStatusValue,
        currentQuantityG: (0).toFixed(3),
      };
    }
    case "LotInsufficientQuantity":
      // Failure event — no state change. Audit-log captures it.
      return null;
    default:
      return null;
  }
};
