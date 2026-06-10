import type { QuantityGrams, ULID } from "@canna/shared";

export type MemberStatus =
  | "EMPTY"
  | "PENDING_CONSENT"
  | "ACTIVE"
  | "SUSPENDED"
  | "ANONYMIZED";

export interface ActivePrescription {
  readonly prescriptionId: ULID;
  readonly validFrom: Date;
  readonly validUntil: Date;
  readonly monthlyQuotaG: QuantityGrams;
}

export interface MemberState {
  readonly status: MemberStatus;
  readonly memberId: ULID | null;
  readonly associationId: ULID | null;
  readonly cpfHash: string | null;
  readonly consentVersion: number | null;
  readonly prescription: ActivePrescription | null;
}

export const emptyMemberState: MemberState = {
  status: "EMPTY",
  memberId: null,
  associationId: null,
  cpfHash: null,
  consentVersion: null,
  prescription: null,
};
