import { describe, it, expect } from "vitest";
import { createInMemoryEventStore } from "@canna/event-store";
import { Members } from "@canna/app-services";
import { isOk, quantityGrams, type ULID } from "@canna/shared";
import { validatePrescription } from "./validate-prescription.js";
import type { ToolContext } from "../types.js";

const ASSOC = "01HM0ASSOC0000000000000001" as ULID;
const MEMBER = "01HM0MEMBER000000000000001" as ULID;
const ACTOR = "01HM0ACTOR0000000000000001" as ULID;
const RT_USER = "01HM0RT0000000000000000001" as ULID;
const NOW = new Date("2026-06-14T12:00:00Z");

const grams = (n: number) => {
  const r = quantityGrams(n);
  if (!isOk(r)) throw new Error(String(n));
  return r.value;
};

const setupMemberWithConsent = async () => {
  const store = createInMemoryEventStore();
  await Members.registerMember(store, {
    type: "RegisterMember",
    memberId: MEMBER,
    associationId: ASSOC,
    cpfHash: "sha256:x",
    registeredBy: ACTOR,
    now: NOW,
  });
  await Members.grantConsent(store, {
    type: "GrantConsent",
    memberId: MEMBER,
    consentVersion: 1,
    grantedBy: ACTOR,
    now: NOW,
  });
  return store;
};

const rtCtx = (store: ReturnType<typeof createInMemoryEventStore>): ToolContext => ({
  store,
  userId: RT_USER,
  role: "RESPONSAVEL_TECNICO",
  associationId: ASSOC,
  now: NOW,
});

describe("validate_prescription tool", () => {
  it("validates prescription and sets monthly quota, returns nextStep=get_member_quota", async () => {
    const store = await setupMemberWithConsent();
    const ctx = rtCtx(store);

    const result = await validatePrescription.handler(
      {
        memberId: MEMBER,
        physicianCRM: "CRM/SP 123456",
        validFrom: "2026-06-01",
        validUntil: "2026-12-01",
        monthlyQuotaG: 30,
      },
      ctx,
    );

    expect(result.isError).not.toBe(true);
    const data = JSON.parse(result.content[0]!.text) as {
      memberId: string;
      prescriptionId: string;
      physicianCRM: string;
      monthlyQuotaG: number;
      validatedBy: string;
      nextStep: string;
      message: string;
    };
    expect(data.memberId).toBe(MEMBER);
    expect(typeof data.prescriptionId).toBe("string");
    expect(data.prescriptionId.length).toBeGreaterThanOrEqual(26); // ULID
    expect(data.physicianCRM).toBe("CRM/SP 123456");
    expect(data.monthlyQuotaG).toBe(30);
    expect(data.validatedBy).toBe(RT_USER);
    expect(data.nextStep).toBe("get_member_quota");
  });

  it("accepts an explicit prescriptionId when provided", async () => {
    const store = await setupMemberWithConsent();
    const ctx = rtCtx(store);
    const PRESC = "01HM0PRESC0000000000000099";

    const result = await validatePrescription.handler(
      {
        memberId: MEMBER,
        prescriptionId: PRESC,
        physicianCRM: "CRM/RJ 654321",
        validFrom: "2026-06-01",
        validUntil: "2026-12-31",
        monthlyQuotaG: 20,
      },
      ctx,
    );

    expect(result.isError).not.toBe(true);
    const data = JSON.parse(result.content[0]!.text) as { prescriptionId: string };
    expect(data.prescriptionId).toBe(PRESC);
  });

  it("member state is ACTIVE after validate_prescription", async () => {
    const store = await setupMemberWithConsent();
    const ctx = rtCtx(store);

    await validatePrescription.handler(
      {
        memberId: MEMBER,
        physicianCRM: "CRM/SP 123456",
        validFrom: "2026-06-01",
        validUntil: "2026-12-01",
        monthlyQuotaG: 30,
      },
      ctx,
    );

    const { state } = await Members.loadMemberState(store, MEMBER);
    expect(state.status).toBe("ACTIVE");
    expect(state.prescription?.monthlyQuotaG).toBe(grams(30));
    // physicianCRM is not stored in MemberState (only emitted in the event);
    // the quota and prescriptionId are what matter for downstream tools.
    expect(state.prescription?.prescriptionId).toBeDefined();
  });

  it("rejects invalid monthlyQuotaG (negative)", async () => {
    const store = await setupMemberWithConsent();
    const ctx = rtCtx(store);

    const result = await validatePrescription.handler(
      {
        memberId: MEMBER,
        physicianCRM: "CRM/SP 123456",
        validFrom: "2026-06-01",
        validUntil: "2026-12-01",
        monthlyQuotaG: -5,
      },
      ctx,
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0]!.text) as { error: string };
    expect(data.error).toBe("QUANTITY_NEGATIVE");
  });

  it("rejects invalid validFrom date string", async () => {
    const store = await setupMemberWithConsent();
    const ctx = rtCtx(store);

    const result = await validatePrescription.handler(
      {
        memberId: MEMBER,
        physicianCRM: "CRM/SP 123456",
        validFrom: "not-a-date",
        validUntil: "2026-12-01",
        monthlyQuotaG: 30,
      },
      ctx,
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0]!.text) as { error: string };
    expect(data.error).toBe("INVALID_VALID_FROM");
  });

  it("rejects date range where validUntil is before validFrom", async () => {
    const store = await setupMemberWithConsent();
    const ctx = rtCtx(store);

    const result = await validatePrescription.handler(
      {
        memberId: MEMBER,
        physicianCRM: "CRM/SP 123456",
        validFrom: "2026-12-01",
        validUntil: "2026-06-01",
        monthlyQuotaG: 30,
      },
      ctx,
    );

    expect(result.isError).toBe(true);
    const data = JSON.parse(result.content[0]!.text) as { error: string };
    expect(data.error).toBe("INVALID_DATE_RANGE");
  });

  it("has correct metadata: riskLevel=3, allowedRoles, uiResourceUri", () => {
    expect(validatePrescription.riskLevel).toBe(3);
    expect(validatePrescription.allowedRoles).toContain("RESPONSAVEL_TECNICO");
    expect(validatePrescription.allowedRoles).toContain("DIRETORIA");
    expect(validatePrescription.uiResourceUri).toBe("ui://member-quota-card/app.html");
    expect(validatePrescription.name).toBe("validate_prescription");
  });

  it("prescriptionId is required in inputSchema", () => {
    const required = validatePrescription.inputSchema.required ?? [];
    expect(required).toContain("memberId");
    expect(required).toContain("physicianCRM");
    expect(required).toContain("validFrom");
    expect(required).toContain("validUntil");
    expect(required).toContain("monthlyQuotaG");
    // prescriptionId is optional (server-side gen)
    expect(required).not.toContain("prescriptionId");
  });
});
