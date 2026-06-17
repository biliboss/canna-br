/**
 * request_record_dispensation — end-to-end integration spec.
 *
 * Proves the wave.6 coupled cards together:
 *   1. cb-dispensation-record-unwire-stub — the tool no longer stubs a
 *      PendingAction; it appends real DispensationRecorded + MemberQuotaConsumed
 *      + LotQuantityDeducted events via the Dispensations app-service.
 *   2. cb-quota-consumed-projection — feeding the emitted event log through
 *      `applyEventsToPg` lands a `dispensations` row AND increments
 *      `member_quota.consumed_g` (idempotent on replay).
 *
 * Uses InMemoryTransport for the full MCP pipeline (RBAC → handler → domain →
 * event-store) and a REAL Postgres engine (pglite) for the projection assertion.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { createInMemoryEventStore } from "@canna/event-store";
import { Members, Lots } from "@canna/app-services";
import { isOk, quantityGrams, type ULID } from "@canna/shared";
import { applyEventsToPg } from "@canna/read-models";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createCannaMcpServer } from "../server.js";
import { allTools } from "./index.js";
import type { ToolContext } from "../types.js";

const ASSOC = "01HM0ASSOC0000000000000001" as ULID;
const MEMBER = "01HM0MEMBER000000000000001" as ULID;
const LOT = "01HM0LOT000000000000000001" as ULID;
const DISPENSER = "01HM0DISP0000000000000001" as ULID;
const RT_USER = "01HM0RT0000000000000000001" as ULID;
const APPROVER = "01HM0APPR0V0000000000000001" as ULID;
const NOW = new Date("2026-06-14T10:00:00Z");

/** Helper: full RDC 1.014 flow — DISPENSADOR requests, distinct RT approves. */
const requestThenApprove = async (
  store: ReturnType<typeof createInMemoryEventStore>,
  quantityG: number,
) => {
  const requester = await connectAs("DISPENSADOR", store, DISPENSER);
  const reqRes = await requester.callTool({
    name: "request_record_dispensation",
    arguments: { associationId: ASSOC, memberId: MEMBER, lotId: LOT, quantityG },
  });
  const reqData = JSON.parse(
    (reqRes as { content: Array<{ text: string }> }).content[0]?.text ?? "{}",
  ) as Record<string, unknown>;
  const dispensationId = reqData.dispensationId as string;
  const approver = await connectAs("RESPONSAVEL_TECNICO", store, APPROVER);
  const apprRes = await approver.callTool({
    name: "approve_dispensation",
    arguments: { associationId: ASSOC, dispensationId },
  });
  return { reqData, apprRes, dispensationId };
};

const gramsValue = (n: number) => {
  const r = quantityGrams(n);
  if (!isOk(r)) throw new Error(`bad grams ${String(n)}`);
  return r.value;
};

const migrationPath = fileURLToPath(
  new URL(
    "../../node_modules/@canna/read-models/migrations/0001-init.sql",
    import.meta.url,
  ),
);

/**
 * Seed: ACTIVE member with a validated prescription (quota 30g) + an AVAILABLE
 * lot (100g). This is the precondition for a successful RecordDispensation.
 */
const seedStore = async () => {
  const store = createInMemoryEventStore();

  await Members.registerMember(store, {
    type: "RegisterMember",
    memberId: MEMBER,
    associationId: ASSOC,
    cpfHash: "sha256:test",
    registeredBy: RT_USER,
    now: NOW,
  });
  await Members.grantConsent(store, {
    type: "GrantConsent",
    memberId: MEMBER,
    consentVersion: 1,
    grantedBy: RT_USER,
    now: NOW,
  });
  await Members.validatePrescription(store, {
    type: "ValidatePrescription",
    memberId: MEMBER,
    prescriptionId: "01HM0PRESC0000000000000001" as ULID,
    physicianCRM: "CRM/SP 123456",
    validFrom: new Date("2026-06-01T00:00:00Z"),
    validUntil: new Date("2026-12-01T00:00:00Z"),
    monthlyQuotaG: gramsValue(30),
    validatedBy: RT_USER,
    now: NOW,
  });

  await Lots.createLot(store, {
    type: "CreateLot",
    lotId: LOT,
    associationId: ASSOC,
    productSku: "FLOS-01",
    initialQuantityG: gramsValue(100),
    origin: "INTERNAL_CULTIVATION",
    producedAt: new Date("2026-05-01T00:00:00Z"),
    expiresAt: new Date("2027-05-01T00:00:00Z"),
    createdBy: RT_USER,
    now: NOW,
  });
  await Lots.releaseLot(store, {
    type: "ReleaseLot",
    lotId: LOT,
    coaReference: "COA-2026-001",
    releasedBy: RT_USER,
    now: NOW,
  });

  return store;
};

const connectAs = async (
  role: ToolContext["role"],
  store: ReturnType<typeof createInMemoryEventStore>,
  userId: string = DISPENSER,
) => {
  const { server } = createCannaMcpServer({
    store,
    async resolveContext(): Promise<ToolContext> {
      return { store, userId, role, associationId: ASSOC, now: NOW };
    },
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-record-disp", version: "0.0.0" });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return client;
};

const parse = (res: unknown): Record<string, unknown> => {
  const content = (res as { content: Array<{ text: string }> }).content;
  return JSON.parse(content[0]?.text ?? "{}") as Record<string, unknown>;
};

/** Collect the full ordered event log across the seeded streams + dispensation. */
const collectAllEvents = async (
  store: ReturnType<typeof createInMemoryEventStore>,
) => {
  const member = await store.readStream(`member:${MEMBER}`);
  const lot = await store.readStream(`lot:${LOT}`);
  const disp = await store.readStream(`association:${ASSOC}:dispensations`);
  return [...member.events, ...lot.events, ...disp.events];
};

let pg: PGlite;
let db: ReturnType<typeof drizzle>;

beforeEach(async () => {
  pg = new PGlite();
  const sqlText = readFileSync(migrationPath, "utf8").replace(
    /CREATE EXTENSION[^\n]*\n/,
    "",
  );
  await pg.exec(sqlText);
  db = drizzle(pg);
});

describe("request_record_dispensation — catalog", () => {
  it("is registered at Nível 3, DISPENSADOR only", () => {
    const tool = allTools.find((t) => t.name === "request_record_dispensation");
    expect(tool).toBeDefined();
    expect(tool?.riskLevel).toBe(3);
    expect(tool?.allowedRoles).toEqual(["DISPENSADOR"]);
  });
});

describe("RDC 1.014 two-step approval gate (bypasses LLM)", () => {
  it("(a) DISPENSADOR requests → PENDING_APPROVAL, quota NOT consumed yet", async () => {
    const store = await seedStore();
    const client = await connectAs("DISPENSADOR", store);

    const res = await client.callTool({
      name: "request_record_dispensation",
      arguments: {
        associationId: ASSOC,
        memberId: MEMBER,
        lotId: LOT,
        quantityG: 10,
        justification: "Dispensação mensal",
      },
    });
    const data = parse(res);

    expect(data.status).toBe("PENDING_APPROVAL");
    expect(data.emittedEvents).toEqual(["DispensationRequested"]);

    // Only the request event landed — no quota/lot mutation.
    const disp = await store.readStream(`association:${ASSOC}:dispensations`);
    expect(disp.events.map((e) => e.type)).toEqual(["DispensationRequested"]);
  });

  it("(b) the SAME DISPENSADOR who requested cannot approve → segregation denied", async () => {
    const store = await seedStore();
    const requester = await connectAs("DISPENSADOR", store, DISPENSER);
    const reqRes = await requester.callTool({
      name: "request_record_dispensation",
      arguments: { associationId: ASSOC, memberId: MEMBER, lotId: LOT, quantityG: 10 },
    });
    const dispensationId = parse(reqRes).dispensationId as string;

    // Same identity (DISPENSER), but now carrying an approver role.
    const selfApprover = await connectAs("RESPONSAVEL_TECNICO", store, DISPENSER);
    const apprRes = await selfApprover.callTool({
      name: "approve_dispensation",
      arguments: { associationId: ASSOC, dispensationId },
    });
    expect(parse(apprRes).error).toBe("APPROVAL_SEGREGATION_VIOLATION");

    // Quota still untouched — no recording happened.
    const disp = await store.readStream(`association:${ASSOC}:dispensations`);
    expect(disp.events.map((e) => e.type)).toEqual(["DispensationRequested"]);
  });

  it("(c) a DISTINCT RT approves → RECORDED, quota consumed", async () => {
    const store = await seedStore();
    const { apprRes } = await requestThenApprove(store, 10);
    const data = parse(apprRes);

    expect(data.status).toBe("RECORDED");
    expect(data.approvedBy).toBe(APPROVER);
    expect(data.emittedEvents).toEqual([
      "DispensationRecorded",
      "MemberQuotaConsumed",
      "LotQuantityDeducted",
    ]);

    const disp = await store.readStream(`association:${ASSOC}:dispensations`);
    expect(disp.events.map((e) => e.type)).toEqual([
      "DispensationRequested",
      "DispensationRecorded",
      "MemberQuotaConsumed",
      "LotQuantityDeducted",
    ]);
  });

  it("AUDITOR cannot request (RBAC gate)", async () => {
    const store = await seedStore();
    const client = await connectAs("AUDITOR", store);
    const res = await client.callTool({
      name: "request_record_dispensation",
      arguments: { associationId: ASSOC, memberId: MEMBER, lotId: LOT, quantityG: 5 },
    });
    expect(parse(res).error).toBe("ROLE_INSUFFICIENT");
  });

  it("DISPENSADOR cannot approve (RBAC gate on approve tool)", async () => {
    const store = await seedStore();
    const requester = await connectAs("DISPENSADOR", store, DISPENSER);
    const reqRes = await requester.callTool({
      name: "request_record_dispensation",
      arguments: { associationId: ASSOC, memberId: MEMBER, lotId: LOT, quantityG: 10 },
    });
    const dispensationId = parse(reqRes).dispensationId as string;
    // Another dispensador tries to approve.
    const other = await connectAs("DISPENSADOR", store, APPROVER);
    const apprRes = await other.callTool({
      name: "approve_dispensation",
      arguments: { associationId: ASSOC, dispensationId },
    });
    expect(parse(apprRes).error).toBe("ROLE_INSUFFICIENT");
  });

  it("surfaces QuotaExceededAttempt as REJECTED at approval (no recording)", async () => {
    const store = await seedStore();
    const { apprRes } = await requestThenApprove(store, 999);
    const data = parse(apprRes);
    expect(data.status).toBe("REJECTED");
    expect(data.reason).toBe("QuotaExceededAttempt");
  });
});

describe("request_record_dispensation → member_quota projection (pglite)", () => {
  it("approved dispensation → dispensations row + member_quota.consumed_g increments", async () => {
    const store = await seedStore();
    await requestThenApprove(store, 10);

    const events = await collectAllEvents(store);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await applyEventsToPg(db as any, events);

    const disp = await pg.query<{ n: number; quantity_g: string }>(
      "SELECT count(*)::int AS n, max(quantity_g) AS quantity_g FROM dispensations WHERE member_id = $1",
      [MEMBER],
    );
    expect(disp.rows[0]?.n).toBe(1);

    const quota = await pg.query<{ consumed_g: string }>(
      "SELECT consumed_g FROM member_quota WHERE member_id = $1 AND month = '2026-06'",
      [MEMBER],
    );
    expect(quota.rows[0]?.consumed_g).toBe("10.000");
  });

  it("is idempotent: re-applying the same log does NOT double-count", async () => {
    const store = await seedStore();
    await requestThenApprove(store, 10);

    const events = await collectAllEvents(store);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await applyEventsToPg(db as any, events);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await applyEventsToPg(db as any, events); // replay

    const quota = await pg.query<{ consumed_g: string }>(
      "SELECT consumed_g FROM member_quota WHERE member_id = $1 AND month = '2026-06'",
      [MEMBER],
    );
    expect(quota.rows[0]?.consumed_g).toBe("10.000"); // not 20

    const disp = await pg.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM dispensations WHERE member_id = $1",
      [MEMBER],
    );
    expect(disp.rows[0]?.n).toBe(1);
  });
});


