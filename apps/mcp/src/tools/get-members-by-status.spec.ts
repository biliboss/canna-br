/**
 * get_members_by_status — in-process smoke spec.
 *
 * Tests the full MCP tool pipeline via InMemoryTransport (no LLM, no server).
 * Pattern mirrors grant-consent.spec.ts and validate-prescription.spec.ts.
 */
import { describe, it, expect } from "vitest";
import { createInMemoryEventStore } from "@canna/event-store";
import { createInMemoryStore } from "@canna/read-models";
import { Members } from "@canna/app-services";
import { type ULID } from "@canna/shared";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createCannaMcpServer } from "../server.js";
import { allTools } from "./index.js";
import type { ToolContext } from "../types.js";

const ASSOC = "01HM0ASSOC0000000000000001" as ULID;
const MEMBER_A = "01HM0MEMBER000000000000001" as ULID;
const MEMBER_B = "01HM0MEMBER000000000000002" as ULID;
const ACTOR = "01HM0ACTOR0000000000000001" as ULID;
const NOW = new Date("2026-06-14T10:00:00Z");

const setupStore = async () => {
  const store = createInMemoryEventStore();
  const readModelStore = createInMemoryStore();

  // Register two members: A stays PENDING_CONSENT, B gets consent granted
  await Members.registerMember(store, {
    type: "RegisterMember",
    memberId: MEMBER_A,
    associationId: ASSOC,
    cpfHash: "sha256:aaa",
    registeredBy: ACTOR,
    now: NOW,
  });

  await Members.registerMember(store, {
    type: "RegisterMember",
    memberId: MEMBER_B,
    associationId: ASSOC,
    cpfHash: "sha256:bbb",
    registeredBy: ACTOR,
    now: NOW,
  });

  await Members.grantConsent(store, {
    type: "GrantConsent",
    memberId: MEMBER_B,
    consentVersion: 1,
    grantedBy: ACTOR,
    now: NOW,
  });

  // Sync read-model: upsert both members manually (projection applied on registration/consent)
  readModelStore.upsertMember({
    memberId: MEMBER_A,
    associationId: ASSOC,
    cpfHash: "sha256:aaa",
    status: "PENDING_CONSENT",
    consentVersion: null,
    createdAt: NOW,
    updatedAt: NOW,
  });

  readModelStore.upsertMember({
    memberId: MEMBER_B,
    associationId: ASSOC,
    cpfHash: "sha256:bbb",
    status: "ACTIVE",
    consentVersion: 1,
    createdAt: NOW,
    updatedAt: NOW,
  });

  return { store, readModelStore };
};

const connectAs = async (role: ToolContext["role"]) => {
  const { store, readModelStore } = await setupStore();
  const { server } = createCannaMcpServer({
    store,
    async resolveContext(): Promise<ToolContext> {
      return {
        store,
        readModelStore,
        userId: ACTOR,
        role,
        associationId: ASSOC,
        now: NOW,
      };
    },
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-get-members-by-status", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, store, readModelStore };
};

const parseResult = (res: unknown): Record<string, unknown> => {
  const content = (res as { content: Array<{ text: string }> }).content;
  return JSON.parse(content[0]?.text ?? "{}") as Record<string, unknown>;
};

describe("@canna/mcp / get_members_by_status — catalog", () => {
  it("get_members_by_status is registered in allTools at Nível 1", () => {
    const tool = allTools.find((t) => t.name === "get_members_by_status");
    expect(tool).toBeDefined();
    expect(tool?.riskLevel).toBe(1);
  });

  it("allowedRoles includes DISPENSADOR, RT, DPO, AUDITOR, DIRETORIA", () => {
    const tool = allTools.find((t) => t.name === "get_members_by_status");
    expect(tool?.allowedRoles).toContain("DISPENSADOR");
    expect(tool?.allowedRoles).toContain("RESPONSAVEL_TECNICO");
    expect(tool?.allowedRoles).toContain("DPO");
    expect(tool?.allowedRoles).toContain("AUDITOR");
    expect(tool?.allowedRoles).toContain("DIRETORIA");
  });

  it("uiResourceUri points at member-lifecycle-board", () => {
    const tool = allTools.find((t) => t.name === "get_members_by_status");
    expect(tool?.uiResourceUri).toBe("ui://member-lifecycle-board/app.html");
  });
});

describe("@canna/mcp / get_members_by_status — smoke (in-process)", () => {
  it("returns all members grouped by status when no filter supplied", async () => {
    const { client } = await connectAs("DISPENSADOR");
    const res = await client.callTool({ name: "get_members_by_status", arguments: {} });
    const data = parseResult(res);

    expect(data.associationId).toBe(ASSOC);
    expect(data.statusFilter).toBeNull();
    expect(data.totalCount).toBe(2);
    const grouped = data.grouped as Record<string, unknown[]>;
    expect(grouped["PENDING_CONSENT"]).toHaveLength(1);
    expect(grouped["ACTIVE"]).toHaveLength(1);
  });

  it("filters to ACTIVE only when status=ACTIVE supplied", async () => {
    const { client } = await connectAs("AUDITOR");
    const res = await client.callTool({
      name: "get_members_by_status",
      arguments: { status: "ACTIVE" },
    });
    const data = parseResult(res);

    expect(data.statusFilter).toBe("ACTIVE");
    expect(data.totalCount).toBe(1);
    const grouped = data.grouped as Record<string, unknown[]>;
    expect(grouped["ACTIVE"]).toHaveLength(1);
    expect(grouped["PENDING_CONSENT"]).toBeUndefined();
  });

  it("returns totalCount=0 for a status with no members (e.g. SUSPENDED)", async () => {
    const { client } = await connectAs("RESPONSAVEL_TECNICO");
    const res = await client.callTool({
      name: "get_members_by_status",
      arguments: { status: "SUSPENDED" },
    });
    const data = parseResult(res);

    expect(data.totalCount).toBe(0);
    expect(data.grouped).toEqual({});
  });

  it("returns INVALID_STATUS error for an unrecognised status value", async () => {
    const { client } = await connectAs("DPO");
    const res = await client.callTool({
      name: "get_members_by_status",
      arguments: { status: "UNKNOWN_STATUS" },
    });
    const data = parseResult(res);

    expect((res as { isError?: boolean }).isError).toBe(true);
    expect(data.error).toBe("INVALID_STATUS");
  });

  it("GUEST role is denied (RBAC gate)", async () => {
    const { store, readModelStore } = await setupStore();
    const { server } = createCannaMcpServer({
      store,
      async resolveContext(): Promise<ToolContext> {
        return {
          store,
          readModelStore,
          userId: ACTOR,
          role: "GUEST",
          associationId: ASSOC,
          now: NOW,
        };
      },
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-guest", version: "0.0.0" });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const res = await client.callTool({
      name: "get_members_by_status",
      arguments: {},
    });
    const data = parseResult(res);
    expect(data.error).toBe("ROLE_INSUFFICIENT");
  });

  it("returns READ_MODEL_STORE_UNAVAILABLE when readModelStore is absent", async () => {
    const store = createInMemoryEventStore();
    const { server } = createCannaMcpServer({
      store,
      async resolveContext(): Promise<ToolContext> {
        // readModelStore intentionally omitted
        return {
          store,
          userId: ACTOR,
          role: "DISPENSADOR",
          associationId: ASSOC,
          now: NOW,
        };
      },
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-no-store", version: "0.0.0" });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const res = await client.callTool({
      name: "get_members_by_status",
      arguments: {},
    });
    const data = parseResult(res);
    expect(data.error).toBe("READ_MODEL_STORE_UNAVAILABLE");
  });
});
