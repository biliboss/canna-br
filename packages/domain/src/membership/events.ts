import type { DomainEvent, QuantityGrams, ULID } from "@canna/shared";

export type MemberRegistered = DomainEvent<
  "MemberRegistered",
  {
    readonly memberId: ULID;
    readonly associationId: ULID;
    readonly cpfHash: string;
    readonly registeredBy: ULID;
  }
>;

export type ConsentGranted = DomainEvent<
  "ConsentGranted",
  {
    readonly memberId: ULID;
    readonly consentVersion: number;
    readonly grantedBy: ULID;
  }
>;

export type ConsentRevoked = DomainEvent<
  "ConsentRevoked",
  {
    readonly memberId: ULID;
    readonly consentVersion: number;
    readonly revokedBy: ULID;
  }
>;

export type PrescriptionValidated = DomainEvent<
  "PrescriptionValidated",
  {
    readonly memberId: ULID;
    readonly prescriptionId: ULID;
    readonly physicianCRM: string;
    readonly validFrom: Date;
    readonly validUntil: Date;
    readonly monthlyQuotaG: QuantityGrams;
    readonly validatedBy: ULID;
  }
>;

export type QuotaUpdated = DomainEvent<
  "QuotaUpdated",
  {
    readonly memberId: ULID;
    readonly prescriptionId: ULID;
    readonly previousQuotaG: QuantityGrams;
    readonly newQuotaG: QuantityGrams;
    readonly updatedBy: ULID;
  }
>;

export type MemberSuspended = DomainEvent<
  "MemberSuspended",
  {
    readonly memberId: ULID;
    readonly reason: string;
    readonly suspendedBy: ULID;
  }
>;

export type MemberReinstated = DomainEvent<
  "MemberReinstated",
  {
    readonly memberId: ULID;
    readonly reinstatedBy: ULID;
  }
>;

export type MemberAnonymized = DomainEvent<
  "MemberAnonymized",
  {
    readonly memberId: ULID;
    readonly reason: "LGPD_ART_18_IV" | "INACTIVE_RETENTION_EXPIRED";
    readonly anonymizedBy: ULID;
  }
>;

export type MemberEvent =
  | MemberRegistered
  | ConsentGranted
  | ConsentRevoked
  | PrescriptionValidated
  | QuotaUpdated
  | MemberSuspended
  | MemberReinstated
  | MemberAnonymized;
