import type { DomainError, QuantityGrams } from "@canna/shared";
import {
  domainError,
  event,
  isOk,
  subtractGrams,
} from "@canna/shared";
import type { RecordDispensation } from "./commands.js";
import type { DispensationEvent } from "./events.js";
import type { DispensationContext } from "./state.js";

const streamId = (associationId: string): string =>
  `association:${associationId}:dispensations`;

const monthOf = (d: Date): string =>
  `${String(d.getUTCFullYear())}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

export const decide = (
  cmd: RecordDispensation,
  ctx: DispensationContext,
): readonly DispensationEvent[] | DomainError => {
  if (ctx.dispenserRole !== "DISPENSADOR") {
    return domainError(
      "ROLE_INSUFFICIENT",
      "Only DISPENSADOR can record dispensation",
      { role: ctx.dispenserRole },
    );
  }

  if (
    ctx.responsavelTecnicoId !== null &&
    ctx.responsavelTecnicoId === cmd.dispensedBy
  ) {
    return domainError(
      "SEGREGATION_VIOLATION",
      "Dispensador cannot be the same person as Responsável Técnico",
      { userId: cmd.dispensedBy },
    );
  }

  if (cmd.approvedBy !== null && cmd.approvedBy === cmd.dispensedBy) {
    return domainError(
      "APPROVAL_SEGREGATION_VIOLATION",
      "Approver cannot be the same person as Dispensador",
      { userId: cmd.dispensedBy },
    );
  }

  if ((cmd.quantityG as number) <= 0) {
    return domainError(
      "QUANTITY_NON_POSITIVE",
      "Dispensation quantity must be > 0",
      { quantityG: cmd.quantityG as number },
    );
  }

  if (ctx.member.memberId !== cmd.memberId) {
    return domainError(
      "MEMBER_NOT_FOUND",
      "Member context does not match command memberId",
    );
  }

  if (ctx.member.status === "EMPTY" || ctx.member.status === "PENDING_CONSENT") {
    return domainError(
      "MEMBER_NOT_ACTIVE",
      "Member is not ACTIVE",
      { status: ctx.member.status },
    );
  }

  if (ctx.member.status === "SUSPENDED") {
    return domainError(
      "MEMBER_SUSPENDED",
      "Suspended member cannot receive dispensation",
    );
  }

  if (ctx.member.status === "ANONYMIZED") {
    return domainError(
      "MEMBER_ANONYMIZED",
      "Anonymized member cannot receive dispensation",
    );
  }

  const prescription = ctx.member.prescription;
  if (prescription === null) {
    return domainError(
      "PRESCRIPTION_MISSING",
      "Member has no validated prescription",
    );
  }

  if (cmd.now < prescription.validFrom || cmd.now >= prescription.validUntil) {
    return domainError(
      "PRESCRIPTION_EXPIRED",
      "Prescription is outside its validity window",
      {
        now: cmd.now.toISOString(),
        validFrom: prescription.validFrom.toISOString(),
        validUntil: prescription.validUntil.toISOString(),
      },
    );
  }

  if (ctx.lot.lotId !== cmd.lotId) {
    return domainError(
      "LOT_NOT_FOUND",
      "Lot context does not match command lotId",
    );
  }

  if (ctx.lot.status !== "AVAILABLE") {
    return domainError(
      "LOT_NOT_AVAILABLE",
      "Lot is not available for dispensation",
      { status: ctx.lot.status },
    );
  }

  const lotRemaining = ctx.lot.quantityG;
  if (lotRemaining === null) {
    return domainError(
      "LOT_QUANTITY_UNKNOWN",
      "Lot has no recorded quantity",
    );
  }

  const expectedMonth = monthOf(cmd.now);
  if (expectedMonth !== ctx.month) {
    return domainError(
      "MONTH_MISMATCH",
      "Dispensation month must match the loaded quota window",
      { expected: expectedMonth, got: ctx.month },
    );
  }

  // Quota check — emits rejection event (not DomainError) to preserve audit
  const quotaSub = subtractGrams(
    prescription.monthlyQuotaG,
    ctx.quotaConsumedThisMonthG,
  );
  const quotaRemaining: QuantityGrams = isOk(quotaSub)
    ? quotaSub.value
    : (0 as QuantityGrams);

  const quotaAfterAttempt = subtractGrams(quotaRemaining, cmd.quantityG);
  if (!isOk(quotaAfterAttempt)) {
    return [
      event(
        "QuotaExceededAttempt",
        streamId(cmd.associationId),
        cmd.now,
        {
          memberId: cmd.memberId,
          month: ctx.month,
          attemptedQuantityG: cmd.quantityG,
          quotaRemainingG: quotaRemaining,
          attemptedBy: cmd.dispensedBy,
        },
      ),
    ];
  }

  // Inventory check — emits rejection event
  const lotAfterAttempt = subtractGrams(lotRemaining, cmd.quantityG);
  if (!isOk(lotAfterAttempt)) {
    return [
      event(
        "LotInsufficientQuantity",
        streamId(cmd.associationId),
        cmd.now,
        {
          lotId: cmd.lotId,
          attemptedQuantityG: cmd.quantityG,
          lotRemainingG: lotRemaining,
          attemptedBy: cmd.dispensedBy,
        },
      ),
    ];
  }

  // Happy path — three events in a single atomic append
  const quotaConsumed = subtractGrams(quotaRemaining, cmd.quantityG);
  const lotDeducted = subtractGrams(lotRemaining, cmd.quantityG);
  if (!isOk(quotaConsumed) || !isOk(lotDeducted)) {
    return domainError(
      "INVARIANT_VIOLATED",
      "Quota or lot subtraction unexpectedly failed",
    );
  }

  const stream = streamId(cmd.associationId);
  const events: DispensationEvent[] = [
    event("DispensationRecorded", stream, cmd.now, {
      dispensationId: cmd.dispensationId,
      associationId: cmd.associationId,
      memberRef: cmd.memberId,
      inventoryLotRef: cmd.lotId,
      prescriptionRef: prescription.prescriptionId,
      quantityG: cmd.quantityG,
      dispensedBy: cmd.dispensedBy,
      approvedBy: cmd.approvedBy,
    }),
    event("MemberQuotaConsumed", stream, cmd.now, {
      memberId: cmd.memberId,
      dispensationId: cmd.dispensationId,
      month: ctx.month,
      quantityG: cmd.quantityG,
      quotaBeforeG: quotaRemaining,
      quotaAfterG: quotaConsumed.value,
      consumedBy: cmd.dispensedBy,
    }),
    event("LotQuantityDeducted", stream, cmd.now, {
      lotId: cmd.lotId,
      dispensationId: cmd.dispensationId,
      quantityG: cmd.quantityG,
      quantityBeforeG: lotRemaining,
      quantityAfterG: lotDeducted.value,
      deductedBy: cmd.dispensedBy,
    }),
  ];

  return events;
};
