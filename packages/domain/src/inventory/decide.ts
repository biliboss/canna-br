import type { DomainError, QuantityGrams } from "@canna/shared";
import {
  domainError,
  event,
  isOk,
  subtractGrams,
} from "@canna/shared";
import type { InventoryCommand } from "./commands.js";
import type { InventoryEvent } from "./events.js";
import type { LotState } from "./state.js";

const streamId = (lotId: string): string => `lot:${lotId}`;

export const decide = (
  cmd: InventoryCommand,
  state: LotState,
): readonly InventoryEvent[] | DomainError => {
  switch (cmd.type) {
    case "CreateLot": {
      if (state.status !== "EMPTY") {
        return domainError(
          "LOT_ALREADY_EXISTS",
          "Lot stream already initialized",
          { status: state.status },
        );
      }
      if (cmd.producedAt >= cmd.expiresAt) {
        return domainError(
          "LOT_INVALID_DATES",
          "producedAt must be strictly before expiresAt",
        );
      }
      return [
        event("LotCreated", streamId(cmd.lotId), cmd.now, {
          lotId: cmd.lotId,
          associationId: cmd.associationId,
          productSku: cmd.productSku,
          initialQuantityG: cmd.initialQuantityG,
          origin: cmd.origin,
          producedAt: cmd.producedAt,
          expiresAt: cmd.expiresAt,
          createdBy: cmd.createdBy,
        }),
      ];
    }

    case "QuarantineLot": {
      if (state.status === "EMPTY") {
        return domainError("LOT_NOT_FOUND", "Lot does not exist");
      }
      if (state.status === "EXHAUSTED" || state.status === "RECALLED") {
        return domainError(
          "LOT_TERMINAL_STATE",
          "Lot in terminal state cannot be quarantined",
          { status: state.status },
        );
      }
      if (state.status === "QUARANTINED") {
        return domainError(
          "LOT_ALREADY_QUARANTINED",
          "Lot already quarantined",
        );
      }
      return [
        event("LotQuarantined", streamId(cmd.lotId), cmd.now, {
          lotId: cmd.lotId,
          reason: cmd.reason,
          quarantinedBy: cmd.quarantinedBy,
        }),
      ];
    }

    case "ReleaseLot": {
      if (state.status !== "QUARANTINED") {
        return domainError(
          "LOT_NOT_QUARANTINED",
          "Only QUARANTINED lots can be released",
          { status: state.status },
        );
      }
      return [
        event("LotReleased", streamId(cmd.lotId), cmd.now, {
          lotId: cmd.lotId,
          coaReference: cmd.coaReference,
          releasedBy: cmd.releasedBy,
        }),
      ];
    }

    case "DeductLotQuantity": {
      if (state.status !== "AVAILABLE") {
        return domainError(
          "LOT_NOT_AVAILABLE",
          "Lot is not available for dispensation",
          { status: state.status },
        );
      }
      const remaining = state.quantityG;
      if (remaining === null) {
        return domainError(
          "LOT_QUANTITY_UNKNOWN",
          "Lot has no recorded quantity",
        );
      }
      const sub = subtractGrams(remaining, cmd.quantityG);
      if (!isOk(sub)) {
        const insufficient: InventoryEvent = event(
          "LotInsufficientQuantity",
          streamId(cmd.lotId),
          cmd.now,
          {
            lotId: cmd.lotId,
            attemptedQuantityG: cmd.quantityG,
            lotRemainingG: remaining,
            attemptedBy: cmd.deductedBy,
          },
        );
        return [insufficient];
      }
      const after: QuantityGrams = sub.value;
      const events: InventoryEvent[] = [
        event("LotQuantityDeducted", streamId(cmd.lotId), cmd.now, {
          lotId: cmd.lotId,
          dispensationId: cmd.dispensationId,
          quantityG: cmd.quantityG,
          quantityBeforeG: remaining,
          quantityAfterG: after,
          deductedBy: cmd.deductedBy,
        }),
      ];
      if ((after as number) === 0) {
        events.push(
          event("LotExhausted", streamId(cmd.lotId), cmd.now, {
            lotId: cmd.lotId,
          }),
        );
      }
      return events;
    }

    case "RecallLot": {
      if (state.status === "EMPTY") {
        return domainError("LOT_NOT_FOUND", "Lot does not exist");
      }
      if (state.status === "RECALLED") {
        return domainError(
          "LOT_ALREADY_RECALLED",
          "Lot already recalled",
        );
      }
      return [
        event("LotRecalled", streamId(cmd.lotId), cmd.now, {
          lotId: cmd.lotId,
          reason: cmd.reason,
          recalledBy: cmd.recalledBy,
        }),
      ];
    }
  }
};
