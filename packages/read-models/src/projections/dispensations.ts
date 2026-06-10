import type { Dispensation } from "@canna/domain";
import type { DomainEvent, QuantityGrams } from "@canna/shared";
import { gramsToNumber } from "@canna/shared";

import type { NewDispensationRow } from "../schema/dispensations.js";

const gramsToNumeric = (q: QuantityGrams): string => gramsToNumber(q).toFixed(3);

/**
 * Pure projection step for the `dispensations` table.
 *
 * `DispensationRecorded` is the only event that creates/updates a row.
 * Other dispensation-stream events (MemberQuotaConsumed, LotQuantityDeducted,
 * QuotaExceededAttempt, LotInsufficientQuantity) are projected by other
 * read-models or only by the audit log.
 */
export const projectDispensation = (
  state: NewDispensationRow | null,
  event: DomainEvent<string, unknown>,
): NewDispensationRow | null => {
  const typed = event as Dispensation.DispensationEvent;

  if (typed.type !== "DispensationRecorded") return null;
  const next: NewDispensationRow = {
    dispensationId: typed.payload.dispensationId,
    associationId: typed.payload.associationId,
    memberId: typed.payload.memberRef,
    lotId: typed.payload.inventoryLotRef,
    prescriptionId: typed.payload.prescriptionRef,
    quantityG: gramsToNumeric(typed.payload.quantityG),
    dispensedBy: typed.payload.dispensedBy,
    approvedBy: typed.payload.approvedBy,
    dispensedAt: state?.dispensedAt ?? typed.occurredAt,
  };
  return next;
};
