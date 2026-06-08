import type { MemberEvent } from "./events.js";
import type { MemberState } from "./state.js";
import { emptyMemberState } from "./state.js";

export const evolve = (state: MemberState, event: MemberEvent): MemberState => {
  switch (event.type) {
    case "MemberRegistered":
      return {
        ...emptyMemberState,
        status: "PENDING_CONSENT",
        memberId: event.payload.memberId,
        associationId: event.payload.associationId,
        cpfHash: event.payload.cpfHash,
      };
    case "ConsentGranted":
      return {
        ...state,
        status: state.status === "PENDING_CONSENT" ? "ACTIVE" : state.status,
        consentVersion: event.payload.consentVersion,
      };
    case "ConsentRevoked":
      return {
        ...state,
        status: "SUSPENDED",
        consentVersion: null,
      };
    case "PrescriptionValidated":
      return {
        ...state,
        prescription: {
          prescriptionId: event.payload.prescriptionId,
          validFrom: event.payload.validFrom,
          validUntil: event.payload.validUntil,
          monthlyQuotaG: event.payload.monthlyQuotaG,
        },
      };
    case "QuotaUpdated":
      return state.prescription === null
        ? state
        : {
            ...state,
            prescription: {
              ...state.prescription,
              monthlyQuotaG: event.payload.newQuotaG,
            },
          };
    case "MemberSuspended":
      return { ...state, status: "SUSPENDED" };
    case "MemberReinstated":
      return {
        ...state,
        status: state.status === "SUSPENDED" ? "ACTIVE" : state.status,
      };
    case "MemberAnonymized":
      return {
        ...emptyMemberState,
        status: "ANONYMIZED",
        memberId: event.payload.memberId,
      };
  }
};
