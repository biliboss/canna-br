import { describe, it, expect } from "vitest";
import {
  domainError,
  isDomainError,
  isOk,
  quantityGrams,
  type ULID,
} from "@canna/shared";
import { decide, decideApprove, decideRequest } from "./decide.js";
import type { DispensationContext } from "./state.js";
import type { MemberState } from "../membership/state.js";
import type { LotState } from "../inventory/state.js";
import type { DispensationEvent } from "./events.js";

const ASSOC_ID = "01HM0ASSOC0000000000000001" as ULID;
const MEMBER_ID = "01HM0MEMBER000000000000001" as ULID;
const LOT_ID = "01HM0LOT00000000000000001" as ULID;
const DISP_ID = "01HM0DISP00000000000000001" as ULID;
const PRESC_ID = "01HM0PRESC0000000000000001" as ULID;
const DISPENSER = "01HM0DISP0R000000000000001" as ULID;
const RT_ID = "01HM0RT0000000000000000001" as ULID;
const APPROVER = "01HM0APPR0V0000000000000001" as ULID;
const NOW = new Date("2026-06-08T12:00:00Z");
const STREAM = `association:${ASSOC_ID}:dispensations`;

const grams = (n: number) => {
  const r = quantityGrams(n);
  if (!isOk(r)) throw new Error(String(n));
  return r.value;
};
const ZERO = grams(0);

const activeMember = (monthlyQuotaG = 30): MemberState => ({
  status: "ACTIVE",
  memberId: MEMBER_ID,
  associationId: ASSOC_ID,
  cpfHash: "sha256:x",
  consentVersion: 1,
  prescription: {
    prescriptionId: PRESC_ID,
    validFrom: new Date("2026-06-01T00:00:00Z"),
    validUntil: new Date("2026-12-01T00:00:00Z"),
    monthlyQuotaG: grams(monthlyQuotaG),
  },
});

const availableLot = (quantityG = 100): LotState => ({
  status: "AVAILABLE",
  lotId: LOT_ID,
  associationId: ASSOC_ID,
  productSku: "CBD-X",
  quantityG: grams(quantityG),
  expiresAt: new Date("2027-04-01T00:00:00Z"),
});

const ctx = (overrides: Partial<DispensationContext> = {}): DispensationContext => ({
  member: activeMember(),
  lot: availableLot(),
  month: "2026-06",
  quotaConsumedThisMonthG: ZERO,
  dispenserRole: "DISPENSADOR",
  responsavelTecnicoId: RT_ID,
  ...overrides,
});

const baseRecord = () => ({
  type: "RecordDispensation" as const,
  dispensationId: DISP_ID,
  associationId: ASSOC_ID,
  memberId: MEMBER_ID,
  lotId: LOT_ID,
  quantityG: grams(5),
  dispensedBy: DISPENSER,
  approvedBy: null,
  now: NOW,
});

const stripVolatile = (e: unknown): unknown => {
  if (e === null || typeof e !== "object") return e;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(e as Record<string, unknown>)) {
    if (k === "occurredAt" || k === "streamId") continue;
    out[k] = v instanceof Date ? v.toISOString() : v;
  }
  return out;
};

const expectEvents = (
  result: readonly DispensationEvent[] | ReturnType<typeof domainError>,
  expected: readonly { type: string; payload: unknown }[],
): void => {
  if (isDomainError(result)) {
    throw new Error(`Expected events, got DomainError: ${result.code}`);
  }
  expect(result.length).toBe(expected.length);
  for (let i = 0; i < expected.length; i += 1) {
    const actualEvent = result[i] as { type: string; payload: unknown };
    const expectedEvent = expected[i] as { type: string; payload: unknown };
    expect(actualEvent.type).toBe(expectedEvent.type);
    expect(stripVolatile(actualEvent.payload)).toEqual(
      stripVolatile(expectedEvent.payload),
    );
  }
};

const expectError = (
  result: readonly DispensationEvent[] | ReturnType<typeof domainError>,
  code: string,
): void => {
  if (!isDomainError(result)) {
    throw new Error(`Expected DomainError ${code}, got events`);
  }
  expect(result.code).toBe(code);
};

const expectRejectionEvent = (
  result: readonly DispensationEvent[] | ReturnType<typeof domainError>,
  type: string,
): void => {
  if (isDomainError(result)) {
    throw new Error(`Expected rejection event ${type}, got DomainError`);
  }
  expect(result.length).toBe(1);
  expect((result[0] as { type: string }).type).toBe(type);
};

describe("Dispensation / happy path", () => {
  it("emits DispensationRecorded + MemberQuotaConsumed + LotQuantityDeducted (single append)", () => {
    const r = decide(baseRecord(), ctx());
    expectEvents(r, [
      {
        type: "DispensationRecorded",
        payload: {
          dispensationId: DISP_ID,
          associationId: ASSOC_ID,
          memberRef: MEMBER_ID,
          inventoryLotRef: LOT_ID,
          prescriptionRef: PRESC_ID,
          quantityG: grams(5),
          dispensedBy: DISPENSER,
          approvedBy: null,
        },
      },
      {
        type: "MemberQuotaConsumed",
        payload: {
          memberId: MEMBER_ID,
          dispensationId: DISP_ID,
          month: "2026-06",
          quantityG: grams(5),
          quotaBeforeG: grams(30),
          quotaAfterG: grams(25),
          consumedBy: DISPENSER,
        },
      },
      {
        type: "LotQuantityDeducted",
        payload: {
          lotId: LOT_ID,
          dispensationId: DISP_ID,
          quantityG: grams(5),
          quantityBeforeG: grams(100),
          quantityAfterG: grams(95),
          deductedBy: DISPENSER,
        },
      },
    ]);
  });

  it("all 3 events share the same streamId (association:ID:dispensations)", () => {
    const r = decide(baseRecord(), ctx());
    if (isDomainError(r)) throw new Error("unexpected");
    for (const e of r) {
      expect((e as { streamId: string }).streamId).toBe(STREAM);
    }
  });

  it("preserves approver when two-step approval is used", () => {
    const r = decide({ ...baseRecord(), approvedBy: APPROVER }, ctx());
    if (isDomainError(r)) throw new Error("unexpected");
    const recorded = r[0] as { payload: { approvedBy: string | null } };
    expect(recorded.payload.approvedBy).toBe(APPROVER);
  });
});

describe("Dispensation / quota", () => {
  it("quota partial consumed → still passes when remainder ≥ quantity", () => {
    const r = decide(
      { ...baseRecord(), quantityG: grams(10) },
      ctx({ quotaConsumedThisMonthG: grams(15) }),
    );
    if (isDomainError(r)) throw new Error("unexpected");
    expect(r.length).toBe(3);
    const consumed = r[1] as { payload: { quotaBeforeG: number; quotaAfterG: number } };
    expect(consumed.payload.quotaBeforeG).toBe(15);
    expect(consumed.payload.quotaAfterG).toBe(5);
  });

  it("quota exceeded → QuotaExceededAttempt (no state mutation)", () => {
    const r = decide(
      { ...baseRecord(), quantityG: grams(20) },
      ctx({ quotaConsumedThisMonthG: grams(25) }),
    );
    expectRejectionEvent(r, "QuotaExceededAttempt");
    if (!isDomainError(r)) {
      const ev = r[0] as { payload: { quotaRemainingG: number; attemptedQuantityG: number } };
      expect(ev.payload.quotaRemainingG).toBe(5);
      expect(ev.payload.attemptedQuantityG).toBe(20);
    }
  });

  it("quota exactly equal to remaining → passes (boundary)", () => {
    const r = decide(
      { ...baseRecord(), quantityG: grams(5) },
      ctx({ quotaConsumedThisMonthG: grams(25) }),
    );
    if (isDomainError(r)) throw new Error("unexpected");
    expect(r.length).toBe(3);
  });
});

describe("Dispensation / inventory", () => {
  it("lot insufficient (but within quota) → LotInsufficientQuantity (no state mutation)", () => {
    const r = decide(
      { ...baseRecord(), quantityG: grams(20) },
      ctx({ member: activeMember(60), lot: availableLot(10) }),
    );
    expectRejectionEvent(r, "LotInsufficientQuantity");
  });

  it("quarantined lot → LOT_NOT_AVAILABLE", () => {
    const r = decide(
      baseRecord(),
      ctx({ lot: { ...availableLot(), status: "QUARANTINED" } }),
    );
    expectError(r, "LOT_NOT_AVAILABLE");
  });

  it("recalled lot → LOT_NOT_AVAILABLE", () => {
    const r = decide(
      baseRecord(),
      ctx({ lot: { ...availableLot(), status: "RECALLED" } }),
    );
    expectError(r, "LOT_NOT_AVAILABLE");
  });

  it("lot id mismatch → LOT_NOT_FOUND", () => {
    const r = decide(
      { ...baseRecord(), lotId: "01HM0LOT00000000000000999" as ULID },
      ctx(),
    );
    expectError(r, "LOT_NOT_FOUND");
  });
});

describe("Dispensation / member status", () => {
  it("suspended member → MEMBER_SUSPENDED", () => {
    const r = decide(
      baseRecord(),
      ctx({ member: { ...activeMember(), status: "SUSPENDED" } }),
    );
    expectError(r, "MEMBER_SUSPENDED");
  });

  it("pending consent → MEMBER_NOT_ACTIVE", () => {
    const r = decide(
      baseRecord(),
      ctx({ member: { ...activeMember(), status: "PENDING_CONSENT" } }),
    );
    expectError(r, "MEMBER_NOT_ACTIVE");
  });

  it("anonymized member → MEMBER_ANONYMIZED", () => {
    const r = decide(
      baseRecord(),
      ctx({ member: { ...activeMember(), status: "ANONYMIZED" } }),
    );
    expectError(r, "MEMBER_ANONYMIZED");
  });

  it("member without prescription → PRESCRIPTION_MISSING", () => {
    const r = decide(
      baseRecord(),
      ctx({ member: { ...activeMember(), prescription: null } }),
    );
    expectError(r, "PRESCRIPTION_MISSING");
  });

  it("expired prescription → PRESCRIPTION_EXPIRED", () => {
    const r = decide(
      baseRecord(),
      ctx({
        member: {
          ...activeMember(),
          prescription: {
            prescriptionId: PRESC_ID,
            validFrom: new Date("2025-01-01T00:00:00Z"),
            validUntil: new Date("2026-01-01T00:00:00Z"),
            monthlyQuotaG: grams(30),
          },
        },
      }),
    );
    expectError(r, "PRESCRIPTION_EXPIRED");
  });
});

describe("Dispensation / role + segregation", () => {
  it("non-DISPENSADOR role → ROLE_INSUFFICIENT", () => {
    const r = decide(baseRecord(), ctx({ dispenserRole: "ADMIN" }));
    expectError(r, "ROLE_INSUFFICIENT");
  });

  it("dispenser == responsavel técnico → SEGREGATION_VIOLATION", () => {
    const r = decide(
      { ...baseRecord(), dispensedBy: RT_ID },
      ctx(),
    );
    expectError(r, "SEGREGATION_VIOLATION");
  });

  it("approver == dispenser → APPROVAL_SEGREGATION_VIOLATION", () => {
    const r = decide(
      { ...baseRecord(), approvedBy: DISPENSER },
      ctx(),
    );
    expectError(r, "APPROVAL_SEGREGATION_VIOLATION");
  });

  it("approver != dispenser → passes (control)", () => {
    const r = decide(
      { ...baseRecord(), approvedBy: APPROVER },
      ctx(),
    );
    if (isDomainError(r)) throw new Error(`unexpected: ${r.code}`);
    expect(r.length).toBe(3);
  });

  it("non-positive quantity → QUANTITY_NON_POSITIVE", () => {
    const r = decide({ ...baseRecord(), quantityG: grams(0) }, ctx());
    expectError(r, "QUANTITY_NON_POSITIVE");
  });

  it("month mismatch → MONTH_MISMATCH", () => {
    const r = decide(baseRecord(), ctx({ month: "2026-05" }));
    expectError(r, "MONTH_MISMATCH");
  });
});

describe("Dispensation / concurrent same-lot semantics", () => {
  it(
    "two concurrent commands evaluated against stale state — only one path " +
      "yields LotQuantityDeducted; the second emits LotInsufficientQuantity " +
      "on re-evaluation",
    () => {
      // First command sees lot with 10g, dispenses 10g → exhausts lot
      const first = decide(
        { ...baseRecord(), quantityG: grams(10) },
        ctx({ lot: availableLot(10) }),
      );
      expect(isDomainError(first)).toBe(false);

      // Second command, when retried against the new lot state (0g), must
      // emit LotInsufficientQuantity — NOT mutate inventory.
      const second = decide(
        {
          ...baseRecord(),
          dispensationId: "01HM0DISP00000000000000002" as ULID,
          quantityG: grams(10),
        },
        ctx({ lot: availableLot(0) }),
      );
      expectRejectionEvent(second, "LotInsufficientQuantity");
    },
  );
});

describe("RDC 1.014 — two-step approval gate (request → approve)", () => {
  const pending = (requestedBy = DISPENSER) => ({
    dispensationId: DISP_ID as string,
    memberId: MEMBER_ID as string,
    lotId: LOT_ID as string,
    quantityG: grams(5),
    requestedBy: requestedBy as string,
  });

  it("(a) DISPENSADOR requests → DispensationRequested, consumes NOTHING", () => {
    const result = decideRequest(
      {
        type: "RequestDispensation",
        dispensationId: DISP_ID,
        associationId: ASSOC_ID,
        memberId: MEMBER_ID,
        lotId: LOT_ID,
        quantityG: grams(5),
        requestedBy: DISPENSER,
        now: NOW,
      },
      ctx(),
    );
    if (isDomainError(result)) throw new Error(`unexpected error ${result.code}`);
    // Single event, NO quota/lot deduction events.
    expect(result.map((e) => e.type)).toEqual(["DispensationRequested"]);
  });

  it("(b) the SAME user who requested tries to approve → APPROVAL_SEGREGATION_VIOLATION", () => {
    const result = decideApprove(
      {
        type: "ApproveDispensation",
        dispensationId: DISP_ID,
        associationId: ASSOC_ID,
        approvedBy: DISPENSER, // same identity as requester
        now: NOW,
      },
      ctx({
        // approver carries RT role but IS the dispenser identity-wise
        dispenserRole: "DISPENSADOR",
        responsavelTecnicoId: null,
        pendingRequest: pending(DISPENSER),
      }),
    );
    expectError(result, "APPROVAL_SEGREGATION_VIOLATION");
  });

  it("(c) a DISTINCT approver effects it → DispensationRecorded + quota consumed + lot deducted", () => {
    const result = decideApprove(
      {
        type: "ApproveDispensation",
        dispensationId: DISP_ID,
        associationId: ASSOC_ID,
        approvedBy: APPROVER, // distinct from requester
        now: NOW,
      },
      ctx({
        dispenserRole: "DISPENSADOR",
        responsavelTecnicoId: null,
        pendingRequest: pending(DISPENSER),
      }),
    );
    if (isDomainError(result)) throw new Error(`unexpected error ${result.code}`);
    expect(result.map((e) => e.type)).toEqual([
      "DispensationRecorded",
      "MemberQuotaConsumed",
      "LotQuantityDeducted",
    ]);
    const recorded = result[0] as { payload: { approvedBy: string; dispensedBy: string } };
    expect(recorded.payload.approvedBy).toBe(APPROVER);
    expect(recorded.payload.dispensedBy).toBe(DISPENSER);
  });

  it("approve with no pending request → PENDING_DISPENSATION_NOT_FOUND", () => {
    const result = decideApprove(
      {
        type: "ApproveDispensation",
        dispensationId: DISP_ID,
        associationId: ASSOC_ID,
        approvedBy: APPROVER,
        now: NOW,
      },
      ctx({ pendingRequest: null }),
    );
    expectError(result, "PENDING_DISPENSATION_NOT_FOUND");
  });
});
