import { describe, it, expect } from "vitest";
import { domainError, isOk, quantityGrams, type ULID } from "@canna/shared";
import { scenario } from "@canna/test-utils";
import { decide } from "./decide.js";
import { evolve } from "./evolve.js";
import { emptyMemberState } from "./state.js";
import type {
  MemberRegistered,
  MemberEvent,
  ConsentGranted,
  ConsentRevoked,
  PrescriptionValidated,
  MemberSuspended,
  MemberReinstated,
  MemberAnonymized,
} from "./events.js";
import type { MemberCommand } from "./commands.js";

const MEMBER_ID = "01HM0MEMBER000000000000001" as ULID;
const ASSOC_ID = "01HM0ASSOC0000000000000001" as ULID;
const ACTOR = "01HM0ACTOR0000000000000001" as ULID;
const PHYSICIAN = "01HM0PHYS00000000000000001" as ULID;
const PRESC_A = "01HM0PRESC0000000000000001" as ULID;
const PRESC_B = "01HM0PRESC0000000000000002" as ULID;
const NOW = new Date("2026-06-08T12:00:00Z");

const grams = (n: number) => {
  const r = quantityGrams(n);
  if (!isOk(r)) throw new Error(`bad quantity ${String(n)}`);
  return r.value;
};

const baseEvent = <T extends string, P>(
  type: T,
  payload: P,
): { type: T; version: 1; streamId: string; occurredAt: Date; payload: P } => ({
  type,
  version: 1,
  streamId: `member:${MEMBER_ID}`,
  occurredAt: NOW,
  payload,
});

const memberRegistered = (): MemberRegistered =>
  baseEvent("MemberRegistered", {
    memberId: MEMBER_ID,
    associationId: ASSOC_ID,
    cpfHash: "sha256:abc",
    registeredBy: ACTOR,
  });

const consentGranted = (version = 1): ConsentGranted =>
  baseEvent("ConsentGranted", {
    memberId: MEMBER_ID,
    consentVersion: version,
    grantedBy: ACTOR,
  });

const prescValidated = (): PrescriptionValidated =>
  baseEvent("PrescriptionValidated", {
    memberId: MEMBER_ID,
    prescriptionId: PRESC_A,
    physicianCRM: "CRM/SP 123456",
    validFrom: new Date("2026-06-01T00:00:00Z"),
    validUntil: new Date("2026-12-01T00:00:00Z"),
    monthlyQuotaG: grams(30),
    validatedBy: PHYSICIAN,
  });

const suspended = (): MemberSuspended =>
  baseEvent("MemberSuspended", {
    memberId: MEMBER_ID,
    reason: "investigação interna",
    suspendedBy: ACTOR,
  });

const reinstated = (): MemberReinstated =>
  baseEvent("MemberReinstated", {
    memberId: MEMBER_ID,
    reinstatedBy: ACTOR,
  });

const consentRevoked = (version = 1): ConsentRevoked =>
  baseEvent("ConsentRevoked", {
    memberId: MEMBER_ID,
    consentVersion: version,
    revokedBy: ACTOR,
  });

const anonymized = (): MemberAnonymized =>
  baseEvent("MemberAnonymized", {
    memberId: MEMBER_ID,
    reason: "LGPD_ART_18_IV",
    anonymizedBy: ACTOR,
  });

const run = (
  given: readonly MemberEvent[],
  cmd: MemberCommand,
  then: readonly MemberEvent[] | ReturnType<typeof domainError>,
) =>
  scenario({
    initial: emptyMemberState,
    given,
    when: cmd,
    then,
    decide,
    evolve,
  });

describe("Membership / RegisterMember", () => {
  it("GIVEN no events / WHEN RegisterMember / THEN MemberRegistered", () => {
    run(
      [],
      {
        type: "RegisterMember",
        memberId: MEMBER_ID,
        associationId: ASSOC_ID,
        cpfHash: "sha256:abc",
        registeredBy: ACTOR,
        now: NOW,
      },
      [memberRegistered()],
    );
  });

  it("GIVEN MemberRegistered / WHEN RegisterMember / THEN MEMBER_ALREADY_REGISTERED", () => {
    run(
      [memberRegistered()],
      {
        type: "RegisterMember",
        memberId: MEMBER_ID,
        associationId: ASSOC_ID,
        cpfHash: "sha256:abc",
        registeredBy: ACTOR,
        now: NOW,
      },
      domainError("MEMBER_ALREADY_REGISTERED", "ignored"),
    );
  });
});

describe("Membership / GrantConsent", () => {
  it("GIVEN MemberRegistered / WHEN GrantConsent / THEN ConsentGranted + ACTIVE", () => {
    run(
      [memberRegistered()],
      {
        type: "GrantConsent",
        memberId: MEMBER_ID,
        consentVersion: 1,
        grantedBy: ACTOR,
        now: NOW,
      },
      [consentGranted(1)],
    );
  });

  it("rejects consent on unregistered member", () => {
    run(
      [],
      {
        type: "GrantConsent",
        memberId: MEMBER_ID,
        consentVersion: 1,
        grantedBy: ACTOR,
        now: NOW,
      },
      domainError("MEMBER_NOT_REGISTERED", "ignored"),
    );
  });

  it("rejects re-grant of same version", () => {
    run(
      [memberRegistered(), consentGranted(1)],
      {
        type: "GrantConsent",
        memberId: MEMBER_ID,
        consentVersion: 1,
        grantedBy: ACTOR,
        now: NOW,
      },
      domainError("CONSENT_ALREADY_GRANTED", "ignored"),
    );
  });

  it("rejects consent on anonymized member", () => {
    run(
      [memberRegistered(), consentGranted(1), anonymized()],
      {
        type: "GrantConsent",
        memberId: MEMBER_ID,
        consentVersion: 2,
        grantedBy: ACTOR,
        now: NOW,
      },
      domainError("MEMBER_ANONYMIZED", "ignored"),
    );
  });
});

describe("Membership / ValidatePrescription", () => {
  it("GIVEN ACTIVE / WHEN ValidatePrescription / THEN PrescriptionValidated", () => {
    run(
      [memberRegistered(), consentGranted(1)],
      {
        type: "ValidatePrescription",
        memberId: MEMBER_ID,
        prescriptionId: PRESC_A,
        physicianCRM: "CRM/SP 123456",
        validFrom: new Date("2026-06-01T00:00:00Z"),
        validUntil: new Date("2026-12-01T00:00:00Z"),
        monthlyQuotaG: grams(30),
        validatedBy: PHYSICIAN,
        now: NOW,
      },
      [prescValidated()],
    );
  });

  it("emits QuotaUpdated + PrescriptionValidated when prescription changes", () => {
    run(
      [memberRegistered(), consentGranted(1), prescValidated()],
      {
        type: "ValidatePrescription",
        memberId: MEMBER_ID,
        prescriptionId: PRESC_B,
        physicianCRM: "CRM/SP 999999",
        validFrom: new Date("2026-12-01T00:00:00Z"),
        validUntil: new Date("2027-06-01T00:00:00Z"),
        monthlyQuotaG: grams(45),
        validatedBy: PHYSICIAN,
        now: NOW,
      },
      [
        baseEvent("QuotaUpdated", {
          memberId: MEMBER_ID,
          prescriptionId: PRESC_B,
          previousQuotaG: grams(30),
          newQuotaG: grams(45),
          updatedBy: PHYSICIAN,
        }),
        baseEvent("PrescriptionValidated", {
          memberId: MEMBER_ID,
          prescriptionId: PRESC_B,
          physicianCRM: "CRM/SP 999999",
          validFrom: new Date("2026-12-01T00:00:00Z"),
          validUntil: new Date("2027-06-01T00:00:00Z"),
          monthlyQuotaG: grams(45),
          validatedBy: PHYSICIAN,
        }),
      ],
    );
  });

  it("rejects prescription on PENDING_CONSENT", () => {
    run(
      [memberRegistered()],
      {
        type: "ValidatePrescription",
        memberId: MEMBER_ID,
        prescriptionId: PRESC_A,
        physicianCRM: "CRM/SP 123456",
        validFrom: new Date("2026-06-01T00:00:00Z"),
        validUntil: new Date("2026-12-01T00:00:00Z"),
        monthlyQuotaG: grams(30),
        validatedBy: PHYSICIAN,
        now: NOW,
      },
      domainError("MEMBER_NOT_ACTIVE", "ignored"),
    );
  });

  it("rejects invalid time window", () => {
    run(
      [memberRegistered(), consentGranted(1)],
      {
        type: "ValidatePrescription",
        memberId: MEMBER_ID,
        prescriptionId: PRESC_A,
        physicianCRM: "CRM/SP 123456",
        validFrom: new Date("2026-12-01T00:00:00Z"),
        validUntil: new Date("2026-06-01T00:00:00Z"),
        monthlyQuotaG: grams(30),
        validatedBy: PHYSICIAN,
        now: NOW,
      },
      domainError("PRESCRIPTION_INVALID_WINDOW", "ignored"),
    );
  });
});

describe("Membership / Suspend & Reinstate", () => {
  it("ACTIVE → suspends", () => {
    run(
      [memberRegistered(), consentGranted(1)],
      {
        type: "SuspendMember",
        memberId: MEMBER_ID,
        reason: "investigação interna",
        suspendedBy: ACTOR,
        now: NOW,
      },
      [suspended()],
    );
  });

  it("SUSPENDED → reinstates → ACTIVE", () => {
    run(
      [memberRegistered(), consentGranted(1), suspended()],
      {
        type: "ReinstateMember",
        memberId: MEMBER_ID,
        reinstatedBy: ACTOR,
        now: NOW,
      },
      [reinstated()],
    );
  });

  it("PENDING_CONSENT cannot be suspended", () => {
    run(
      [memberRegistered()],
      {
        type: "SuspendMember",
        memberId: MEMBER_ID,
        reason: "x",
        suspendedBy: ACTOR,
        now: NOW,
      },
      domainError("MEMBER_NOT_ACTIVE", "ignored"),
    );
  });

  it("ACTIVE cannot be reinstated", () => {
    run(
      [memberRegistered(), consentGranted(1)],
      {
        type: "ReinstateMember",
        memberId: MEMBER_ID,
        reinstatedBy: ACTOR,
        now: NOW,
      },
      domainError("MEMBER_NOT_SUSPENDED", "ignored"),
    );
  });
});

describe("Membership / AnonymizeMember", () => {
  it("ACTIVE → anonymized", () => {
    run(
      [memberRegistered(), consentGranted(1)],
      {
        type: "AnonymizeMember",
        memberId: MEMBER_ID,
        reason: "LGPD_ART_18_IV",
        anonymizedBy: ACTOR,
        now: NOW,
      },
      [anonymized()],
    );
  });

  it("rejects double-anonymization", () => {
    run(
      [memberRegistered(), consentGranted(1), anonymized()],
      {
        type: "AnonymizeMember",
        memberId: MEMBER_ID,
        reason: "LGPD_ART_18_IV",
        anonymizedBy: ACTOR,
        now: NOW,
      },
      domainError("MEMBER_ALREADY_ANONYMIZED", "ignored"),
    );
  });

  it("rejects anonymize of unregistered member", () => {
    run(
      [],
      {
        type: "AnonymizeMember",
        memberId: MEMBER_ID,
        reason: "LGPD_ART_18_IV",
        anonymizedBy: ACTOR,
        now: NOW,
      },
      domainError("MEMBER_NOT_REGISTERED", "ignored"),
    );
  });
});

describe("Membership / RevokeConsent", () => {
  it("ACTIVE → ConsentRevoked", () => {
    run(
      [memberRegistered(), consentGranted(1)],
      {
        type: "RevokeConsent",
        memberId: MEMBER_ID,
        revokedBy: ACTOR,
        now: NOW,
      },
      [consentRevoked(1)],
    );
  });

  it("rejects revoke on PENDING_CONSENT (not ACTIVE)", () => {
    run(
      [memberRegistered()],
      {
        type: "RevokeConsent",
        memberId: MEMBER_ID,
        revokedBy: ACTOR,
        now: NOW,
      },
      domainError("CONSENT_NOT_REVOCABLE", "ignored"),
    );
  });

  it("rejects revoke on SUSPENDED member", () => {
    run(
      [memberRegistered(), consentGranted(1), suspended()],
      {
        type: "RevokeConsent",
        memberId: MEMBER_ID,
        revokedBy: ACTOR,
        now: NOW,
      },
      domainError("CONSENT_NOT_REVOCABLE", "ignored"),
    );
  });

  it("rejects revoke on ANONYMIZED member", () => {
    run(
      [memberRegistered(), consentGranted(1), anonymized()],
      {
        type: "RevokeConsent",
        memberId: MEMBER_ID,
        revokedBy: ACTOR,
        now: NOW,
      },
      domainError("CONSENT_NOT_REVOCABLE", "ignored"),
    );
  });

  it("CONSENT_NOT_GRANTED when ACTIVE but no consent version (revoke→reinstate→revoke)", () => {
    // revoke clears consentVersion → SUSPENDED; reinstate → ACTIVE with v=null
    run(
      [memberRegistered(), consentGranted(1), consentRevoked(1), reinstated()],
      {
        type: "RevokeConsent",
        memberId: MEMBER_ID,
        revokedBy: ACTOR,
        now: NOW,
      },
      domainError("CONSENT_NOT_GRANTED", "ignored"),
    );
  });
});

describe("Membership / ReinstateMember illegal transitions", () => {
  it("PENDING_CONSENT cannot be reinstated", () => {
    run(
      [memberRegistered()],
      {
        type: "ReinstateMember",
        memberId: MEMBER_ID,
        reinstatedBy: ACTOR,
        now: NOW,
      },
      domainError("MEMBER_NOT_SUSPENDED", "ignored"),
    );
  });

  it("ANONYMIZED cannot be reinstated", () => {
    run(
      [memberRegistered(), consentGranted(1), anonymized()],
      {
        type: "ReinstateMember",
        memberId: MEMBER_ID,
        reinstatedBy: ACTOR,
        now: NOW,
      },
      domainError("MEMBER_NOT_SUSPENDED", "ignored"),
    );
  });

  it("EMPTY (unregistered) cannot be reinstated", () => {
    run(
      [],
      {
        type: "ReinstateMember",
        memberId: MEMBER_ID,
        reinstatedBy: ACTOR,
        now: NOW,
      },
      domainError("MEMBER_NOT_SUSPENDED", "ignored"),
    );
  });
});

describe("Membership / evolve idempotence & terminal transitions", () => {
  const fold = (events: readonly MemberEvent[]) =>
    events.reduce((s, e) => evolve(s, e), emptyMemberState);

  it("ConsentRevoked applied twice converges (SUSPENDED, version null)", () => {
    const once = fold([memberRegistered(), consentGranted(1), consentRevoked(1)]);
    const twice = evolve(once, consentRevoked(1));
    expect(once).toEqual(twice);
    expect(once.status).toBe("SUSPENDED");
    expect(once.consentVersion).toBeNull();
  });

  it("MemberSuspended applied twice converges", () => {
    const once = fold([memberRegistered(), consentGranted(1), suspended()]);
    const twice = evolve(once, suspended());
    expect(once).toEqual(twice);
    expect(once.status).toBe("SUSPENDED");
  });

  it("MemberReinstated on non-suspended state is a no-op (terminal guard)", () => {
    const active = fold([memberRegistered(), consentGranted(1)]);
    const reinstatedActive = evolve(active, reinstated());
    expect(reinstatedActive).toEqual(active);
  });

  it("MemberAnonymized is terminal and idempotent (re-apply converges)", () => {
    const once = fold([memberRegistered(), consentGranted(1), anonymized()]);
    const twice = evolve(once, anonymized());
    expect(once).toEqual(twice);
    expect(once.status).toBe("ANONYMIZED");
    expect(once.cpfHash).toBeNull();
  });

  it("QuotaUpdated with no prescription is a no-op", () => {
    const noPresc = fold([memberRegistered(), consentGranted(1)]);
    const quotaUpdated = baseEvent("QuotaUpdated", {
      memberId: MEMBER_ID,
      prescriptionId: PRESC_A,
      previousQuotaG: grams(30),
      newQuotaG: grams(45),
      updatedBy: PHYSICIAN,
    }) as MemberEvent;
    expect(evolve(noPresc, quotaUpdated)).toEqual(noPresc);
  });
});
