/**
 * Typed test-data factories for the canna-oss domain.
 *
 * Each factory produces a VALID domain event (the real `@canna/domain` event
 * type, imported as `import type` — type-only, so there is no runtime cycle
 * with `domain → test-utils → domain`) with sensible deterministic defaults and
 * shallow partial overrides on the payload.
 *
 * Reusable by specs AND by the deterministic seed (`scripts/seed.ts`): the seed
 * folds the produced events through `applyEventsToPg`, so the same factory that
 * a spec uses to drive a Decider also populates a real Postgres read-model.
 *
 * Determinism: ids/dates default to fixed constants. Pass overrides to vary
 * them. Re-calling a factory with the same overrides yields a structurally
 * identical event (idempotent seeds).
 */
import type { QuantityGrams, ULID } from "@canna/shared";
import type { Dispensation, Inventory, Membership } from "@canna/domain";

const grams = (n: number): QuantityGrams => n as QuantityGrams;
const id = (s: string): ULID => s as ULID;

// ---------- shared deterministic defaults ------------------------------------

export const TEST_IDS = {
  association: id("01HZASSOC00000000000000001"),
  actor: id("01HZACTOR00000000000000001"),
  physician: id("01HZPHYS000000000000000001"),
} as const;

const DEFAULT_AT = new Date("2026-06-01T12:00:00.000Z");

const memberStream = (memberId: ULID): string => `member:${memberId}`;
const lotStream = (lotId: ULID): string => `lot:${lotId}`;
const dispenseStream = (associationId: ULID): string =>
  `association:${associationId}:dispensations`;

type Overrides<P> = Partial<P>;

// ---------- Member -----------------------------------------------------------

/**
 * A registered (PENDING) member. Default id `01HZMEMBER...0001`.
 * Combine with {@link consentGranted} to drive the member to ACTIVE.
 */
export const memberRegistered = (
  over: Overrides<Membership.MemberRegistered["payload"]> = {},
  occurredAt: Date = DEFAULT_AT,
): Membership.MemberRegistered => {
  const memberId = over.memberId ?? id("01HZMEMBER0000000000000001");
  return {
    type: "MemberRegistered",
    version: 1,
    streamId: memberStream(memberId),
    occurredAt,
    payload: {
      memberId,
      associationId: TEST_IDS.association,
      cpfHash: "sha256:deadbeef",
      registeredBy: TEST_IDS.actor,
      ...over,
    },
  };
};

export const consentGranted = (
  over: Overrides<Membership.ConsentGranted["payload"]> = {},
  occurredAt: Date = DEFAULT_AT,
): Membership.ConsentGranted => {
  const memberId = over.memberId ?? id("01HZMEMBER0000000000000001");
  return {
    type: "ConsentGranted",
    version: 1,
    streamId: memberStream(memberId),
    occurredAt,
    payload: {
      memberId,
      consentVersion: 1,
      grantedBy: TEST_IDS.actor,
      ...over,
    },
  };
};

export const memberSuspended = (
  over: Overrides<Membership.MemberSuspended["payload"]> = {},
  occurredAt: Date = DEFAULT_AT,
): Membership.MemberSuspended => {
  const memberId = over.memberId ?? id("01HZMEMBER0000000000000001");
  return {
    type: "MemberSuspended",
    version: 1,
    streamId: memberStream(memberId),
    occurredAt,
    payload: {
      memberId,
      reason: "ADMINISTRATIVE_REVIEW",
      suspendedBy: TEST_IDS.actor,
      ...over,
    },
  };
};

export const prescriptionValidated = (
  over: Overrides<Membership.PrescriptionValidated["payload"]> = {},
  occurredAt: Date = DEFAULT_AT,
): Membership.PrescriptionValidated => {
  const memberId = over.memberId ?? id("01HZMEMBER0000000000000001");
  return {
    type: "PrescriptionValidated",
    version: 1,
    streamId: memberStream(memberId),
    occurredAt,
    payload: {
      memberId,
      prescriptionId: id("01HZPRESC00000000000000001"),
      physicianCRM: "CRM/SP-123456",
      validFrom: new Date("2026-06-01T00:00:00.000Z"),
      validUntil: new Date("2026-12-01T00:00:00.000Z"),
      monthlyQuotaG: grams(40),
      validatedBy: TEST_IDS.physician,
      ...over,
    },
  };
};

// ---------- Lot (Inventory) --------------------------------------------------

export const lotCreated = (
  over: Overrides<Inventory.LotCreated["payload"]> = {},
  occurredAt: Date = DEFAULT_AT,
): Inventory.LotCreated => {
  const lotId = over.lotId ?? id("01HZLOT0000000000000000001");
  return {
    type: "LotCreated",
    version: 1,
    streamId: lotStream(lotId),
    occurredAt,
    payload: {
      lotId,
      associationId: TEST_IDS.association,
      productSku: "FLOWER-CBD-20",
      initialQuantityG: grams(500),
      origin: "INTERNAL_CULTIVATION",
      producedAt: new Date("2026-05-01T00:00:00.000Z"),
      expiresAt: new Date("2027-05-01T00:00:00.000Z"),
      createdBy: TEST_IDS.actor,
      ...over,
    },
  };
};

/**
 * Release a lot (drives it to RELEASED — i.e. available for dispensation).
 * Pair with {@link lotCreated} sharing the same `lotId`.
 */
export const lotReleased = (
  over: Overrides<Inventory.LotReleased["payload"]> = {},
  occurredAt: Date = DEFAULT_AT,
): Inventory.LotReleased => {
  const lotId = over.lotId ?? id("01HZLOT0000000000000000001");
  return {
    type: "LotReleased",
    version: 1,
    streamId: lotStream(lotId),
    occurredAt,
    payload: {
      lotId,
      coaReference: "COA-2026-0001",
      releasedBy: TEST_IDS.actor,
      ...over,
    },
  };
};

// ---------- Dispensation -----------------------------------------------------

export const dispensationRecorded = (
  over: Overrides<Dispensation.DispensationRecorded["payload"]> = {},
  occurredAt: Date = DEFAULT_AT,
): Dispensation.DispensationRecorded => {
  const associationId = over.associationId ?? TEST_IDS.association;
  return {
    type: "DispensationRecorded",
    version: 1,
    streamId: dispenseStream(associationId),
    occurredAt,
    payload: {
      dispensationId: id("01HZDISP000000000000000001"),
      associationId,
      memberRef: id("01HZMEMBER0000000000000001"),
      inventoryLotRef: id("01HZLOT0000000000000000001"),
      prescriptionRef: id("01HZPRESC00000000000000001"),
      quantityG: grams(10),
      dispensedBy: TEST_IDS.actor,
      approvedBy: null,
      ...over,
    },
  };
};
