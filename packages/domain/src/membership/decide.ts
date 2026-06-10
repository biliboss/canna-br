import type { DomainError } from "@canna/shared";
import { domainError, event } from "@canna/shared";
import type { MemberCommand } from "./commands.js";
import type { MemberEvent } from "./events.js";
import type { MemberState } from "./state.js";

const streamId = (memberId: string): string => `member:${memberId}`;

export const decide = (
  cmd: MemberCommand,
  state: MemberState,
): readonly MemberEvent[] | DomainError => {
  switch (cmd.type) {
    case "RegisterMember": {
      if (state.status !== "EMPTY") {
        return domainError(
          "MEMBER_ALREADY_REGISTERED",
          "Member stream already initialized",
          { status: state.status },
        );
      }
      return [
        event("MemberRegistered", streamId(cmd.memberId), cmd.now, {
          memberId: cmd.memberId,
          associationId: cmd.associationId,
          cpfHash: cmd.cpfHash,
          registeredBy: cmd.registeredBy,
        }),
      ];
    }

    case "GrantConsent": {
      if (state.status === "EMPTY") {
        return domainError(
          "MEMBER_NOT_REGISTERED",
          "Cannot grant consent for unregistered member",
        );
      }
      if (state.status === "ANONYMIZED") {
        return domainError(
          "MEMBER_ANONYMIZED",
          "Anonymized members cannot receive consent",
        );
      }
      if (state.consentVersion === cmd.consentVersion) {
        return domainError(
          "CONSENT_ALREADY_GRANTED",
          "Consent at this version is already granted",
          { consentVersion: cmd.consentVersion },
        );
      }
      return [
        event("ConsentGranted", streamId(cmd.memberId), cmd.now, {
          memberId: cmd.memberId,
          consentVersion: cmd.consentVersion,
          grantedBy: cmd.grantedBy,
        }),
      ];
    }

    case "RevokeConsent": {
      if (state.status !== "ACTIVE") {
        return domainError(
          "CONSENT_NOT_REVOCABLE",
          "Can only revoke consent of ACTIVE member",
          { status: state.status },
        );
      }
      const v = state.consentVersion;
      if (v === null) {
        return domainError(
          "CONSENT_NOT_GRANTED",
          "No consent to revoke",
        );
      }
      return [
        event("ConsentRevoked", streamId(cmd.memberId), cmd.now, {
          memberId: cmd.memberId,
          consentVersion: v,
          revokedBy: cmd.revokedBy,
        }),
      ];
    }

    case "ValidatePrescription": {
      if (state.status !== "ACTIVE") {
        return domainError(
          "MEMBER_NOT_ACTIVE",
          "Only ACTIVE members can receive a validated prescription",
          { status: state.status },
        );
      }
      if (cmd.validFrom >= cmd.validUntil) {
        return domainError(
          "PRESCRIPTION_INVALID_WINDOW",
          "validFrom must be strictly before validUntil",
        );
      }
      const existing = state.prescription;
      if (existing && existing.prescriptionId !== cmd.prescriptionId) {
        const events: MemberEvent[] = [
          event("QuotaUpdated", streamId(cmd.memberId), cmd.now, {
            memberId: cmd.memberId,
            prescriptionId: cmd.prescriptionId,
            previousQuotaG: existing.monthlyQuotaG,
            newQuotaG: cmd.monthlyQuotaG,
            updatedBy: cmd.validatedBy,
          }),
          event("PrescriptionValidated", streamId(cmd.memberId), cmd.now, {
            memberId: cmd.memberId,
            prescriptionId: cmd.prescriptionId,
            physicianCRM: cmd.physicianCRM,
            validFrom: cmd.validFrom,
            validUntil: cmd.validUntil,
            monthlyQuotaG: cmd.monthlyQuotaG,
            validatedBy: cmd.validatedBy,
          }),
        ];
        return events;
      }
      return [
        event("PrescriptionValidated", streamId(cmd.memberId), cmd.now, {
          memberId: cmd.memberId,
          prescriptionId: cmd.prescriptionId,
          physicianCRM: cmd.physicianCRM,
          validFrom: cmd.validFrom,
          validUntil: cmd.validUntil,
          monthlyQuotaG: cmd.monthlyQuotaG,
          validatedBy: cmd.validatedBy,
        }),
      ];
    }

    case "SuspendMember": {
      if (state.status !== "ACTIVE") {
        return domainError(
          "MEMBER_NOT_ACTIVE",
          "Only ACTIVE members can be suspended",
          { status: state.status },
        );
      }
      return [
        event("MemberSuspended", streamId(cmd.memberId), cmd.now, {
          memberId: cmd.memberId,
          reason: cmd.reason,
          suspendedBy: cmd.suspendedBy,
        }),
      ];
    }

    case "ReinstateMember": {
      if (state.status !== "SUSPENDED") {
        return domainError(
          "MEMBER_NOT_SUSPENDED",
          "Only SUSPENDED members can be reinstated",
          { status: state.status },
        );
      }
      return [
        event("MemberReinstated", streamId(cmd.memberId), cmd.now, {
          memberId: cmd.memberId,
          reinstatedBy: cmd.reinstatedBy,
        }),
      ];
    }

    case "AnonymizeMember": {
      if (state.status === "EMPTY") {
        return domainError(
          "MEMBER_NOT_REGISTERED",
          "Cannot anonymize unregistered member",
        );
      }
      if (state.status === "ANONYMIZED") {
        return domainError(
          "MEMBER_ALREADY_ANONYMIZED",
          "Member is already anonymized",
        );
      }
      return [
        event("MemberAnonymized", streamId(cmd.memberId), cmd.now, {
          memberId: cmd.memberId,
          reason: cmd.reason,
          anonymizedBy: cmd.anonymizedBy,
        }),
      ];
    }
  }
};
