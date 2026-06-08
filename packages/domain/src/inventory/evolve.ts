import type { InventoryEvent } from "./events.js";
import type { LotState } from "./state.js";
import { emptyLotState } from "./state.js";

export const evolve = (state: LotState, event: InventoryEvent): LotState => {
  switch (event.type) {
    case "LotCreated":
      return {
        ...emptyLotState,
        status: "QUARANTINED",
        lotId: event.payload.lotId,
        associationId: event.payload.associationId,
        productSku: event.payload.productSku,
        quantityG: event.payload.initialQuantityG,
        expiresAt: event.payload.expiresAt,
      };
    case "LotQuarantined":
      return { ...state, status: "QUARANTINED" };
    case "LotReleased":
      return { ...state, status: "AVAILABLE" };
    case "LotQuantityDeducted":
      return { ...state, quantityG: event.payload.quantityAfterG };
    case "LotExhausted":
      return { ...state, status: "EXHAUSTED" };
    case "LotRecalled":
      return { ...state, status: "RECALLED" };
    case "LotInsufficientQuantity":
      return state;
  }
};
