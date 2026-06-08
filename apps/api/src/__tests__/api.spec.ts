import { describe, it, expect } from "vitest";
import { createInMemoryEventStore } from "@canna/event-store";
import { createCannaApi } from "../app.js";

const ASSOC = "01HM0ASSOC0000000000000001";
const MEMBER = "01HM0MEMBER000000000000001";
const PRESC = "01HM0PRESC0000000000000001";
const ACTOR = "01HM0ACTOR0000000000000001";
const PHYSICIAN = "01HM0PHYS00000000000000001";
const NOW = new Date("2026-06-08T12:00:00Z");

const buildApp = async () => {
  const store = createInMemoryEventStore();
  const app = await createCannaApi({
    store,
    now: () => NOW,
    logger: false,
  });
  return { app, store };
};

describe("@canna/api / health", () => {
  it("GET /health returns 200 with ok+version+uptimeMs", async () => {
    const { app } = await buildApp();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      ok: boolean;
      version: string;
      uptimeMs: number;
    };
    expect(body.ok).toBe(true);
    expect(typeof body.version).toBe("string");
    expect(typeof body.uptimeMs).toBe("number");
    await app.close();
  });
});

describe("@canna/api / commands / register-member", () => {
  it("happy path → 200 with MemberRegistered event + nextVersion", async () => {
    const { app } = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/v1/commands/register-member",
      payload: {
        memberId: MEMBER,
        associationId: ASSOC,
        cpfHash: "sha256:abc",
        registeredBy: ACTOR,
        now: NOW.toISOString(),
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      events: ReadonlyArray<{ type: string }>;
      nextVersion: string;
    };
    expect(body.events).toHaveLength(1);
    expect(body.events[0]!.type).toBe("MemberRegistered");
    expect(body.nextVersion).toBe("1");
    await app.close();
  });

  it("duplicate registration → 400 MEMBER_ALREADY_REGISTERED", async () => {
    const { app } = await buildApp();
    const payload = {
      memberId: MEMBER,
      associationId: ASSOC,
      cpfHash: "sha256:abc",
      registeredBy: ACTOR,
      now: NOW.toISOString(),
    };
    const first = await app.inject({
      method: "POST",
      url: "/v1/commands/register-member",
      payload,
    });
    expect(first.statusCode).toBe(200);
    const dup = await app.inject({
      method: "POST",
      url: "/v1/commands/register-member",
      payload,
    });
    expect(dup.statusCode).toBe(400);
    const body = dup.json() as { error: string; message: string };
    expect(body.error).toBe("MEMBER_ALREADY_REGISTERED");
    await app.close();
  });

  it("invalid body (missing fields) → 400 VALIDATION_ERROR", async () => {
    const { app } = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/v1/commands/register-member",
      payload: { memberId: MEMBER },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json() as { error: string };
    expect(body.error).toBe("VALIDATION_ERROR");
    await app.close();
  });
});

describe("@canna/api / commands / validate-prescription", () => {
  it("rejects when member not ACTIVE → 400 MEMBER_NOT_ACTIVE", async () => {
    const { app } = await buildApp();
    // Register but do NOT grant consent → status PENDING_CONSENT, not ACTIVE.
    await app.inject({
      method: "POST",
      url: "/v1/commands/register-member",
      payload: {
        memberId: MEMBER,
        associationId: ASSOC,
        cpfHash: "sha256:abc",
        registeredBy: ACTOR,
        now: NOW.toISOString(),
      },
    });
    const res = await app.inject({
      method: "POST",
      url: "/v1/commands/validate-prescription",
      payload: {
        memberId: MEMBER,
        prescriptionId: PRESC,
        physicianCRM: "CRM/SP 123456",
        validFrom: new Date("2026-06-01T00:00:00Z").toISOString(),
        validUntil: new Date("2026-12-01T00:00:00Z").toISOString(),
        monthlyQuotaG: 30,
        validatedBy: PHYSICIAN,
        now: NOW.toISOString(),
      },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json() as { error: string };
    expect(body.error).toBe("MEMBER_NOT_ACTIVE");
    await app.close();
  });
});

describe("@canna/api / admin (Nível 4 stubs)", () => {
  it("POST /v1/admin/crypto-delete-member/:id → 501 with TOTP note", async () => {
    const { app } = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/v1/admin/crypto-delete-member/${MEMBER}`,
      payload: {
        totp: "123456",
        justification: "LGPD Art. 18 IV — explicit member request",
      },
    });
    expect(res.statusCode).toBe(501);
    const body = res.json() as { error: string; note: string };
    expect(body.error).toBe("NOT_IMPLEMENTED_TOTP_REQUIRED");
    expect(body.note).toMatch(/TOTP/);
    await app.close();
  });

  it("rejects admin call with missing TOTP → 400 VALIDATION_ERROR", async () => {
    const { app } = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/v1/admin/change-user-role",
      payload: { justification: "promote user" },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json() as { error: string };
    expect(body.error).toBe("VALIDATION_ERROR");
    await app.close();
  });
});

describe("@canna/api / openapi", () => {
  it("GET /openapi.json → 200 + documents register_member and /v1/admin/", async () => {
    const { app } = await buildApp();
    const res = await app.inject({ method: "GET", url: "/openapi.json" });
    expect(res.statusCode).toBe(200);
    const text = res.body;
    expect(text).toContain("register_member");
    expect(text).toContain("/v1/admin/");
    const spec = JSON.parse(text) as {
      openapi: string;
      paths: Record<string, unknown>;
    };
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.paths["/v1/commands/register-member"]).toBeDefined();
    expect(spec.paths["/v1/admin/change-user-role"]).toBeDefined();
    // Dispensation MUST NOT be exposed directly.
    expect(spec.paths["/v1/commands/record-dispensation"]).toBeUndefined();
    await app.close();
  });
});
