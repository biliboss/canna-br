import { describe, it, expect } from "vitest";
import { isOk, isErr, quantityGrams, type ULID } from "@canna/shared";
import { createInMemoryEventStore } from "@canna/event-store";
import { Members, Lots, Dispensations } from "./index.js";

const ASSOC = "01HM0ASSOC0000000000000001" as ULID;
const MEMBER = "01HM0MEMBER000000000000001" as ULID;
const LOT = "01HM0LOT00000000000000001" as ULID;
const DISP = "01HM0DISP00000000000000001" as ULID;
const DISP_2 = "01HM0DISP00000000000000002" as ULID;
const ACTOR = "01HM0ACTOR0000000000000001" as ULID;
const PHYSICIAN = "01HM0PHYS00000000000000001" as ULID;
const PRESC = "01HM0PRESC0000000000000001" as ULID;
const DISPENSER = "01HM0DISP0R000000000000001" as ULID;
const DISPENSER_2 = "01HM0DISP0R000000000000002" as ULID;
const RT_ID = "01HM0RT0000000000000000001" as ULID;
const NOW = new Date("2026-06-08T12:00:00Z");

const grams = (n: number) => {
  const r = quantityGrams(n);
  if (!isOk(r)) throw new Error(`bad ${String(n)}`);
  return r.value;
};

const setupMemberAndLot = async (
  monthlyQuotaG = 30,
  lotInitialG = 100,
) => {
  const store = createInMemoryEventStore();

  // Register member
  const reg = await Members.registerMember(store, {
    type: "RegisterMember",
    memberId: MEMBER,
    associationId: ASSOC,
    cpfHash: "sha256:x",
    registeredBy: ACTOR,
    now: NOW,
  });
  expect(isOk(reg)).toBe(true);

  // Grant consent
  const cons = await Members.grantConsent(store, {
    type: "GrantConsent",
    memberId: MEMBER,
    consentVersion: 1,
    grantedBy: ACTOR,
    now: NOW,
  });
  expect(isOk(cons)).toBe(true);

  // Validate prescription
  const presc = await Members.validatePrescription(store, {
    type: "ValidatePrescription",
    memberId: MEMBER,
    prescriptionId: PRESC,
    physicianCRM: "CRM/SP 123456",
    validFrom: new Date("2026-06-01T00:00:00Z"),
    validUntil: new Date("2026-12-01T00:00:00Z"),
    monthlyQuotaG: grams(monthlyQuotaG),
    validatedBy: PHYSICIAN,
    now: NOW,
  });
  expect(isOk(presc)).toBe(true);

  // Create lot
  const lot = await Lots.createLot(store, {
    type: "CreateLot",
    lotId: LOT,
    associationId: ASSOC,
    productSku: "CBD-FS-200MG",
    initialQuantityG: grams(lotInitialG),
    origin: "INTERNAL_CULTIVATION",
    producedAt: new Date("2026-04-01T00:00:00Z"),
    expiresAt: new Date("2027-04-01T00:00:00Z"),
    createdBy: ACTOR,
    now: NOW,
  });
  expect(isOk(lot)).toBe(true);

  // Release lot
  const rel = await Lots.releaseLot(store, {
    type: "ReleaseLot",
    lotId: LOT,
    coaReference: "coa://lab-abc/2026-04/lot-001",
    releasedBy: ACTOR,
    now: NOW,
  });
  expect(isOk(rel)).toBe(true);

  return store;
};

describe("end-to-end / happy path dispensation", () => {
  it("registers member + creates lot + dispenses → 3 events in association stream", async () => {
    const store = await setupMemberAndLot();

    const r = await Dispensations.recordDispensation(
      {
        store,
        responsavelTecnicoId: RT_ID,
        dispenserRole: "DISPENSADOR",
      },
      {
        type: "RecordDispensation",
        dispensationId: DISP,
        associationId: ASSOC,
        memberId: MEMBER,
        lotId: LOT,
        quantityG: grams(5),
        dispensedBy: DISPENSER,
        approvedBy: null,
        now: NOW,
      },
    );

    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.events).toHaveLength(3);
      expect(r.value.events.map((e) => e.type)).toEqual([
        "DispensationRecorded",
        "MemberQuotaConsumed",
        "LotQuantityDeducted",
      ]);
    }

    // Association stream has 3 events appended
    const { events: assocEvents } = await Dispensations.loadAssociationDispensations(
      store,
      ASSOC,
    );
    expect(assocEvents).toHaveLength(3);
  });

  it("subsequent dispensation reduces quota correctly across calls", async () => {
    const store = await setupMemberAndLot(30, 100);

    const first = await Dispensations.recordDispensation(
      { store, responsavelTecnicoId: RT_ID, dispenserRole: "DISPENSADOR" },
      {
        type: "RecordDispensation",
        dispensationId: DISP,
        associationId: ASSOC,
        memberId: MEMBER,
        lotId: LOT,
        quantityG: grams(10),
        dispensedBy: DISPENSER,
        approvedBy: null,
        now: NOW,
      },
    );
    expect(isOk(first)).toBe(true);

    const second = await Dispensations.recordDispensation(
      { store, responsavelTecnicoId: RT_ID, dispenserRole: "DISPENSADOR" },
      {
        type: "RecordDispensation",
        dispensationId: DISP_2,
        associationId: ASSOC,
        memberId: MEMBER,
        lotId: LOT,
        quantityG: grams(15),
        dispensedBy: DISPENSER,
        approvedBy: null,
        now: NOW,
      },
    );
    expect(isOk(second)).toBe(true);
    if (isOk(second)) {
      const quotaEvent = second.value.events[1] as {
        payload: { quotaBeforeG: number; quotaAfterG: number };
      };
      expect(quotaEvent.payload.quotaBeforeG).toBe(20);
      expect(quotaEvent.payload.quotaAfterG).toBe(5);
    }
  });
});

describe("end-to-end / quota exceeded", () => {
  it("dispensation exceeding monthly quota → QuotaExceededAttempt (no state mutation)", async () => {
    const store = await setupMemberAndLot(30, 100);

    const first = await Dispensations.recordDispensation(
      { store, responsavelTecnicoId: RT_ID, dispenserRole: "DISPENSADOR" },
      {
        type: "RecordDispensation",
        dispensationId: DISP,
        associationId: ASSOC,
        memberId: MEMBER,
        lotId: LOT,
        quantityG: grams(25),
        dispensedBy: DISPENSER,
        approvedBy: null,
        now: NOW,
      },
    );
    expect(isOk(first)).toBe(true);

    const second = await Dispensations.recordDispensation(
      { store, responsavelTecnicoId: RT_ID, dispenserRole: "DISPENSADOR" },
      {
        type: "RecordDispensation",
        dispensationId: DISP_2,
        associationId: ASSOC,
        memberId: MEMBER,
        lotId: LOT,
        quantityG: grams(10),
        dispensedBy: DISPENSER,
        approvedBy: null,
        now: NOW,
      },
    );
    expect(isOk(second)).toBe(true);
    if (isOk(second)) {
      expect(second.value.events.map((e) => e.type)).toEqual([
        "QuotaExceededAttempt",
      ]);
    }

    // Quota event recorded in association stream for audit
    const { events: assocEvents } =
      await Dispensations.loadAssociationDispensations(store, ASSOC);
    const types = assocEvents.map((e) => e.type);
    expect(types).toContain("QuotaExceededAttempt");
  });
});

describe("end-to-end / lot insufficient", () => {
  it("dispensation > lot remaining → LotInsufficientQuantity", async () => {
    const store = await setupMemberAndLot(60, 10);

    const r = await Dispensations.recordDispensation(
      { store, responsavelTecnicoId: RT_ID, dispenserRole: "DISPENSADOR" },
      {
        type: "RecordDispensation",
        dispensationId: DISP,
        associationId: ASSOC,
        memberId: MEMBER,
        lotId: LOT,
        quantityG: grams(20),
        dispensedBy: DISPENSER,
        approvedBy: null,
        now: NOW,
      },
    );
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.events.map((e) => e.type)).toEqual([
        "LotInsufficientQuantity",
      ]);
    }
  });
});

describe("end-to-end / hard validations", () => {
  it("dispenser == RT → SEGREGATION_VIOLATION DomainError", async () => {
    const store = await setupMemberAndLot();

    const r = await Dispensations.recordDispensation(
      { store, responsavelTecnicoId: DISPENSER, dispenserRole: "DISPENSADOR" },
      {
        type: "RecordDispensation",
        dispensationId: DISP,
        associationId: ASSOC,
        memberId: MEMBER,
        lotId: LOT,
        quantityG: grams(5),
        dispensedBy: DISPENSER,
        approvedBy: null,
        now: NOW,
      },
    );
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe("SEGREGATION_VIOLATION");
  });
});

describe("spike gate / optimistic concurrency on association stream", () => {
  it(
    "two concurrent RecordDispensation against same association stream " +
      "(low lot) — both attempts complete; final lot quantity is non-negative " +
      "and total deducted respects lot",
    async () => {
      const store = await setupMemberAndLot(60, 10);

      // Two concurrent attempts, each for 10g → only one can possibly
      // succeed. The retry logic in recordDispensation should ensure the
      // second one re-evaluates against fresh state and emits
      // LotInsufficientQuantity (or LotQuantityDeducted if lot still has).
      const [a, b] = await Promise.all([
        Dispensations.recordDispensation(
          { store, responsavelTecnicoId: RT_ID, dispenserRole: "DISPENSADOR" },
          {
            type: "RecordDispensation",
            dispensationId: DISP,
            associationId: ASSOC,
            memberId: MEMBER,
            lotId: LOT,
            quantityG: grams(10),
            dispensedBy: DISPENSER,
            approvedBy: null,
            now: NOW,
          },
        ),
        Dispensations.recordDispensation(
          { store, responsavelTecnicoId: RT_ID, dispenserRole: "DISPENSADOR" },
          {
            type: "RecordDispensation",
            dispensationId: DISP_2,
            associationId: ASSOC,
            memberId: MEMBER,
            lotId: LOT,
            quantityG: grams(10),
            dispensedBy: DISPENSER_2,
            approvedBy: null,
            now: NOW,
          },
        ),
      ]);

      expect(isOk(a)).toBe(true);
      expect(isOk(b)).toBe(true);
      if (!isOk(a) || !isOk(b)) return;

      const aTypes = a.value.events.map((e) => e.type);
      const bTypes = b.value.events.map((e) => e.type);

      // Exactly one must have succeeded with the 3-event happy path.
      // The other must have emitted LotInsufficientQuantity.
      const winners = [aTypes, bTypes].filter((t) =>
        t.includes("DispensationRecorded"),
      );
      const losers = [aTypes, bTypes].filter((t) =>
        t.includes("LotInsufficientQuantity"),
      );
      expect(winners).toHaveLength(1);
      expect(losers).toHaveLength(1);

      // Association stream contains: 1× happy path (3 events) + 1× rejection (1 event)
      const { events: assocEvents } =
        await Dispensations.loadAssociationDispensations(store, ASSOC);
      const recorded = assocEvents.filter((e) => e.type === "DispensationRecorded");
      const deductions = assocEvents.filter(
        (e) => e.type === "LotQuantityDeducted",
      );
      const insufficient = assocEvents.filter(
        (e) => e.type === "LotInsufficientQuantity",
      );

      expect(recorded).toHaveLength(1);
      expect(deductions).toHaveLength(1);
      expect(insufficient).toHaveLength(1);

      // Total deducted <= initial lot
      const totalDeducted = deductions.reduce(
        (acc, e) =>
          acc + (e.payload as { quantityG: number }).quantityG,
        0,
      );
      expect(totalDeducted).toBeLessThanOrEqual(10);
    },
  );
});
