import { describe, expect, it } from "vitest";
import {
  isOk,
  quantityGrams,
  type DomainEvent,
  type QuantityGrams,
  type ULID,
} from "@canna/shared";
import type { Dispensation, Inventory, Membership } from "@canna/domain";

import { applyEvents } from "../apply.js";
import { auditLogEventId } from "../projections/audit-log.js";
import { createInMemoryStore } from "../store.js";

// ---------- ids + helpers -----------------------------------------------------

const MEMBER_ID = "01HM0MEMBER000000000000001" as ULID;
const ASSOC_ID = "01HM0ASSOC0000000000000001" as ULID;
const ACTOR = "01HM0ACTOR0000000000000001" as ULID;
const PRESC_ID = "01HM0PRESC0000000000000001" as ULID;
const PHYSICIAN = "01HM0PHYS00000000000000001" as ULID;
const LOT_ID = "01HM0LOT00000000000000001A" as ULID;
const DISP_ID = "01HM0DISP000000000000000A1" as ULID;

const NOW = new Date("2026-06-08T12:00:00Z");

const grams = (n: number): QuantityGrams => {
  const r = quantityGrams(n);
  if (!isOk(r)) throw new Error(`bad quantity ${String(n)}`);
  return r.value;
};

const memberStream = `member:${MEMBER_ID}`;
const lotStream = `lot:${LOT_ID}`;
const dispenseStream = `association:${ASSOC_ID}:dispensations`;

const evt = <T extends string, P>(
  type: T,
  streamId: string,
  payload: P,
  occurredAt: Date = NOW,
): DomainEvent<T, P> => ({
  type,
  version: 1,
  streamId,
  occurredAt,
  payload,
});

// ---------- event factories ---------------------------------------------------

const memberRegistered = (): Membership.MemberRegistered =>
  evt("MemberRegistered", memberStream, {
    memberId: MEMBER_ID,
    associationId: ASSOC_ID,
    cpfHash: "sha256:abc",
    registeredBy: ACTOR,
  });

const consentGranted = (): Membership.ConsentGranted =>
  evt(
    "ConsentGranted",
    memberStream,
    {
      memberId: MEMBER_ID,
      consentVersion: 1,
      grantedBy: ACTOR,
    },
    new Date(NOW.getTime() + 1000),
  );

const prescriptionValidated = (): Membership.PrescriptionValidated =>
  evt(
    "PrescriptionValidated",
    memberStream,
    {
      memberId: MEMBER_ID,
      prescriptionId: PRESC_ID,
      physicianCRM: "CRM/SP-12345",
      validFrom: new Date("2026-06-01T00:00:00Z"),
      validUntil: new Date("2026-12-01T00:00:00Z"),
      monthlyQuotaG: grams(60),
      validatedBy: ACTOR,
    },
    new Date(NOW.getTime() + 2000),
  );

const lotCreated = (): Inventory.LotCreated =>
  evt("LotCreated", lotStream, {
    lotId: LOT_ID,
    associationId: ASSOC_ID,
    productSku: "SKU-FLOWER-25",
    initialQuantityG: grams(500),
    origin: "INTERNAL_CULTIVATION",
    producedAt: new Date("2026-05-01T00:00:00Z"),
    expiresAt: new Date("2027-05-01T00:00:00Z"),
    createdBy: ACTOR,
  });

const lotReleased = (): Inventory.LotReleased =>
  evt(
    "LotReleased",
    lotStream,
    {
      lotId: LOT_ID,
      coaReference: "COA-2026-001",
      releasedBy: PHYSICIAN,
    },
    new Date(NOW.getTime() + 500),
  );

const dispensationRecorded = (): Dispensation.DispensationRecorded =>
  evt(
    "DispensationRecorded",
    dispenseStream,
    {
      dispensationId: DISP_ID,
      associationId: ASSOC_ID,
      memberRef: MEMBER_ID,
      inventoryLotRef: LOT_ID,
      prescriptionRef: PRESC_ID,
      quantityG: grams(15),
      dispensedBy: ACTOR,
      approvedBy: null,
    },
    new Date(NOW.getTime() + 10000),
  );

const memberQuotaConsumed = (): Dispensation.MemberQuotaConsumed =>
  evt(
    "MemberQuotaConsumed",
    dispenseStream,
    {
      memberId: MEMBER_ID,
      dispensationId: DISP_ID,
      month: "2026-06",
      quantityG: grams(15),
      quotaBeforeG: grams(60),
      quotaAfterG: grams(45),
      consumedBy: ACTOR,
    },
    new Date(NOW.getTime() + 10000),
  );

const lotQuantityDeducted = (): Inventory.LotQuantityDeducted =>
  evt(
    "LotQuantityDeducted",
    dispenseStream,
    {
      lotId: LOT_ID,
      dispensationId: DISP_ID,
      quantityG: grams(15),
      quantityBeforeG: grams(500),
      quantityAfterG: grams(485),
      deductedBy: ACTOR,
    },
    new Date(NOW.getTime() + 10000),
  );

// ---------- tests -------------------------------------------------------------

describe("read-models projections", () => {
  it("MemberRegistered + ConsentGranted → ACTIVE row in members", () => {
    const store = createInMemoryStore();
    applyEvents([memberRegistered(), consentGranted()], store);

    const row = store.getMember(MEMBER_ID);
    expect(row).toBeDefined();
    expect(row?.status).toBe("ACTIVE");
    expect(row?.associationId).toBe(ASSOC_ID);
    expect(row?.cpfHash).toBe("sha256:abc");
    expect(row?.consentVersion).toBe(1);
    expect(row?.createdAt).toEqual(NOW);
  });

  it("projects PrescriptionValidated into prescriptions table", () => {
    const store = createInMemoryStore();
    applyEvents(
      [memberRegistered(), consentGranted(), prescriptionValidated()],
      store,
    );

    const row = store.getPrescription(PRESC_ID);
    expect(row).toBeDefined();
    expect(row?.memberId).toBe(MEMBER_ID);
    expect(row?.physicianCRM).toBe("CRM/SP-12345");
    expect(row?.monthlyQuotaG).toBe("60.000");
  });

  it("LotCreated → QUARANTINED row; LotReleased → RELEASED", () => {
    const store = createInMemoryStore();
    applyEvents([lotCreated(), lotReleased()], store);

    const row = store.getInventoryLot(LOT_ID);
    expect(row).toBeDefined();
    expect(row?.status).toBe("RELEASED");
    expect(row?.initialQuantityG).toBe("500.000");
    expect(row?.currentQuantityG).toBe("500.000");
  });

  it("DispensationRecorded + MemberQuotaConsumed + LotQuantityDeducted → all three projections updated", () => {
    const store = createInMemoryStore();
    applyEvents(
      [
        memberRegistered(),
        consentGranted(),
        prescriptionValidated(),
        lotCreated(),
        lotReleased(),
        dispensationRecorded(),
        memberQuotaConsumed(),
        lotQuantityDeducted(),
      ],
      store,
    );

    const dispensation = store.getDispensation(DISP_ID);
    expect(dispensation).toBeDefined();
    expect(dispensation?.memberId).toBe(MEMBER_ID);
    expect(dispensation?.lotId).toBe(LOT_ID);
    expect(dispensation?.prescriptionId).toBe(PRESC_ID);
    expect(dispensation?.quantityG).toBe("15.000");
    expect(dispensation?.approvedBy).toBeNull();

    const quota = store.getMemberQuota(MEMBER_ID, "2026-06");
    expect(quota).toBeDefined();
    expect(quota?.consumedG).toBe("15.000");

    const lot = store.getInventoryLot(LOT_ID);
    expect(lot?.currentQuantityG).toBe("485.000");
  });

  it("audit_log captures every applied event verbatim", () => {
    const store = createInMemoryStore();
    const events = [
      memberRegistered(),
      consentGranted(),
      prescriptionValidated(),
      lotCreated(),
      lotReleased(),
      dispensationRecorded(),
      memberQuotaConsumed(),
      lotQuantityDeducted(),
    ];
    applyEvents(events, store);

    const log = store.listAuditLog();
    expect(log).toHaveLength(events.length);

    const types = log.map((r) => r.eventType).sort();
    expect(types).toEqual(
      [
        "ConsentGranted",
        "DispensationRecorded",
        "LotCreated",
        "LotQuantityDeducted",
        "LotReleased",
        "MemberQuotaConsumed",
        "MemberRegistered",
        "PrescriptionValidated",
      ].sort(),
    );

    // every row preserves payload + streamId + occurredAt
    for (const ev of events) {
      const expectedId = auditLogEventId(
        ev.type,
        ev.streamId,
        ev.occurredAt,
        events.indexOf(ev),
      );
      const row = log.find((r) => r.id === expectedId);
      expect(row, `audit row for ${ev.type}`).toBeDefined();
      expect(row?.payload).toEqual(ev.payload);
      expect(row?.streamId).toBe(ev.streamId);
      expect(row?.occurredAt).toEqual(ev.occurredAt);
    }
  });

  it("re-applying the same events is idempotent", () => {
    const store = createInMemoryStore();
    const events = [
      memberRegistered(),
      consentGranted(),
      prescriptionValidated(),
      lotCreated(),
      lotReleased(),
      dispensationRecorded(),
      memberQuotaConsumed(),
      lotQuantityDeducted(),
    ];

    applyEvents(events, store);
    const memberAfterFirst = { ...store.getMember(MEMBER_ID) };
    const quotaAfterFirst = { ...store.getMemberQuota(MEMBER_ID, "2026-06") };
    const lotAfterFirst = { ...store.getInventoryLot(LOT_ID) };
    const auditCountAfterFirst = store.listAuditLog().length;

    // Re-apply: must be a no-op for every projection.
    applyEvents(events, store);

    expect(store.getMember(MEMBER_ID)).toEqual(memberAfterFirst);
    expect(store.getMemberQuota(MEMBER_ID, "2026-06")).toEqual(quotaAfterFirst);
    expect(store.getInventoryLot(LOT_ID)).toEqual(lotAfterFirst);
    expect(store.listAuditLog()).toHaveLength(auditCountAfterFirst);

    // Quota in particular must not double-count.
    expect(store.getMemberQuota(MEMBER_ID, "2026-06")?.consumedG).toBe("15.000");
  });

  it("MemberSuspended then MemberReinstated transitions status correctly", () => {
    const store = createInMemoryStore();
    const suspended: Membership.MemberSuspended = evt(
      "MemberSuspended",
      memberStream,
      {
        memberId: MEMBER_ID,
        reason: "non-compliance",
        suspendedBy: ACTOR,
      },
      new Date(NOW.getTime() + 5000),
    );
    const reinstated: Membership.MemberReinstated = evt(
      "MemberReinstated",
      memberStream,
      { memberId: MEMBER_ID, reinstatedBy: ACTOR },
      new Date(NOW.getTime() + 6000),
    );

    applyEvents([memberRegistered(), consentGranted(), suspended], store);
    expect(store.getMember(MEMBER_ID)?.status).toBe("SUSPENDED");

    applyEvents([reinstated], store);
    expect(store.getMember(MEMBER_ID)?.status).toBe("ACTIVE");
  });
});
