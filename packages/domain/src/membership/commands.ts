import type { QuantityGrams, ULID } from "@canna/shared";

export interface RegisterMember {
  readonly type: "RegisterMember";
  readonly memberId: ULID;
  readonly associationId: ULID;
  readonly cpfHash: string;
  readonly registeredBy: ULID;
  readonly now: Date;
}

export interface GrantConsent {
  readonly type: "GrantConsent";
  readonly memberId: ULID;
  readonly consentVersion: number;
  readonly grantedBy: ULID;
  readonly now: Date;
}

export interface RevokeConsent {
  readonly type: "RevokeConsent";
  readonly memberId: ULID;
  readonly revokedBy: ULID;
  readonly now: Date;
}

export interface ValidatePrescription {
  readonly type: "ValidatePrescription";
  readonly memberId: ULID;
  readonly prescriptionId: ULID;
  readonly physicianCRM: string;
  readonly validFrom: Date;
  readonly validUntil: Date;
  readonly monthlyQuotaG: QuantityGrams;
  readonly validatedBy: ULID;
  readonly now: Date;
}

export interface SuspendMember {
  readonly type: "SuspendMember";
  readonly memberId: ULID;
  readonly reason: string;
  readonly suspendedBy: ULID;
  readonly now: Date;
}

export interface ReinstateMember {
  readonly type: "ReinstateMember";
  readonly memberId: ULID;
  readonly reinstatedBy: ULID;
  readonly now: Date;
}

export interface AnonymizeMember {
  readonly type: "AnonymizeMember";
  readonly memberId: ULID;
  readonly reason: "LGPD_ART_18_IV" | "INACTIVE_RETENTION_EXPIRED";
  readonly anonymizedBy: ULID;
  readonly now: Date;
}

export type MemberCommand =
  | RegisterMember
  | GrantConsent
  | RevokeConsent
  | ValidatePrescription
  | SuspendMember
  | ReinstateMember
  | AnonymizeMember;
