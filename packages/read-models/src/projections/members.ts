import type { Membership } from "@canna/domain";
import type { DomainEvent, QuantityGrams } from "@canna/shared";
import { gramsToNumber } from "@canna/shared";

import type { MemberStatusValue, NewMemberRow } from "../schema/members.js";
import type { NewPrescriptionRow } from "../schema/prescriptions.js";

const gramsToNumeric = (q: QuantityGrams): string => gramsToNumber(q).toFixed(3);

/**
 * Pure projection step for the `members` table.
 *
 * Given the previous row (or `null` if no row exists yet) and a single
 * membership event, returns the row that should be persisted. Returns `null`
 * when the event is not relevant to the members projection.
 */
export const projectMember = (
  state: NewMemberRow | null,
  event: DomainEvent<string, unknown>,
): NewMemberRow | null => {
  const typed = event as Membership.MemberEvent;

  switch (typed.type) {
    case "MemberRegistered": {
      const status: MemberStatusValue = "PENDING_CONSENT";
      return {
        memberId: typed.payload.memberId,
        associationId: typed.payload.associationId,
        cpfHash: typed.payload.cpfHash,
        status,
        consentVersion: state?.consentVersion ?? null,
        createdAt: state?.createdAt ?? typed.occurredAt,
        updatedAt: typed.occurredAt,
      };
    }
    case "ConsentGranted": {
      if (!state) return null;
      return {
        ...state,
        status: "ACTIVE" satisfies MemberStatusValue,
        consentVersion: typed.payload.consentVersion,
        updatedAt: typed.occurredAt,
      };
    }
    case "ConsentRevoked": {
      if (!state) return null;
      return {
        ...state,
        status: "CONSENT_REVOKED" satisfies MemberStatusValue,
        updatedAt: typed.occurredAt,
      };
    }
    case "MemberSuspended": {
      if (!state) return null;
      return {
        ...state,
        status: "SUSPENDED" satisfies MemberStatusValue,
        updatedAt: typed.occurredAt,
      };
    }
    case "MemberReinstated": {
      if (!state) return null;
      return {
        ...state,
        status: "ACTIVE" satisfies MemberStatusValue,
        updatedAt: typed.occurredAt,
      };
    }
    case "MemberAnonymized": {
      if (!state) return null;
      return {
        ...state,
        cpfHash: "ANONYMIZED",
        status: "ANONYMIZED" satisfies MemberStatusValue,
        updatedAt: typed.occurredAt,
      };
    }
    default:
      return null;
  }
};

/**
 * Pure projection step for the `prescriptions` table.
 */
export const projectPrescription = (
  state: NewPrescriptionRow | null,
  event: DomainEvent<string, unknown>,
): NewPrescriptionRow | null => {
  const typed = event as Membership.MemberEvent;

  switch (typed.type) {
    case "PrescriptionValidated": {
      return {
        prescriptionId: typed.payload.prescriptionId,
        memberId: typed.payload.memberId,
        physicianCRM: typed.payload.physicianCRM,
        validFrom: typed.payload.validFrom,
        validUntil: typed.payload.validUntil,
        monthlyQuotaG: gramsToNumeric(typed.payload.monthlyQuotaG),
        validatedAt: typed.occurredAt,
      };
    }
    case "QuotaUpdated": {
      if (!state) return null;
      return {
        ...state,
        monthlyQuotaG: gramsToNumeric(typed.payload.newQuotaG),
      };
    }
    default:
      return null;
  }
};
