/**
 * reinstate_member — in-process spec (bypasses LLM arg-collapse).
 *
 * Tests use InMemoryTransport so the full MCP tool pipeline executes
 * (RBAC gate → handler → domain → event-store) without a running server.
 */
import { describe, it, expect } from "vitest";
import { createInMemoryEventStore } from "@canna/event-store";
import { Members } from "@canna/app-services";
import { type ULID } from "@canna/shared";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createCannaMcpServer } from "../server.js";
import { allTools } from "./index.js";
import type { ToolContext } from "../types.js";

const ASSOC = "01HM0ASSOC0000000000000001" as ULID;
const MEMBER = "01HM0MEMBER000000000000001" as ULID;
const ACTOR = "01HM0ACTOR0000000000000001" as ULID;
const NOW = new Date("2026-06-14T10:00:00Z");

/** Setup store with a SUSPENDED member ready for reinstate_member. */
const setupSuspendedStore = async () => {
  const store = createInMemoryEventStore();
  await Members.registerMember(store, {
    type: "RegisterMember",
    memberId: MEMBER,
    associationId: ASSOC,
    cpfHash: "sha256:test",
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
  await Members.suspendMember(store, {
    type: "SuspendMember",
    memberId: MEMBER,
    reason: "Pendência documental",
    suspendedBy: ACTOR,
    now: NOW,
  });
  return store;
};

const connectAs = async (role: ToolContext["role"]) => {
  const store = await setupSuspendedStore();
  const { server } = createCannaMcpServer({
    store,
    async resolveContext(): Promise<ToolContext> {
      return { store, userId: ACTOR, role, associationId: ASSOC, now: NOW };
    },
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-reinstate-member", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, store };
};

const parseResult = (res: unknown): Record<string, unknown> => {
  const content = (res as { content: Array<{ text: string }> }).content;
  return JSON.parse(content[0]?.text ?? "{}") as Record<string, unknown>;
};

describe("@canna/mcp / reinstate_member tool — catalog", () => {
  it("reinstate_member is registered in allTools at Nível 3", () => {
    const tool = allTools.find((t) => t.name === "reinstate_member");
    expect(tool).toBeDefined();
    expect(tool?.riskLevel).toBe(3);
    expect(tool?.allowedRoles).toContain("RESPONSAVEL_TECNICO");
    expect(tool?.allowedRoles).toContain("DIRETORIA");
    expect(tool?.uiResourceUri).toBe("ui://member-quota-card/app.html");
  });
});

describe("@canna/mcp / reinstate_member tool — handler (bypasses LLM)", () => {
  it("RESPONSAVEL_TECNICO reinstates SUSPENDED member → status ACTIVE", async () => {
    const { client } = await connectAs("RESPONSAVEL_TECNICO");
    const res = await client.callTool({
      name: "reinstate_member",
      arguments: { memberId: MEMBER },
    });
    const data = parseResult(res);
    expect(data.status).toBe("ACTIVE");
    expect(data.memberId).toBe(MEMBER);
    expect(data.reinstatedBy).toBe(ACTOR);
    expect(data.nextStep).toBe("validate_prescription");
    expect(data.associationId).toBe(ASSOC);
  });

  it("DIRETORIA can also reinstate a member", async () => {
    const { client } = await connectAs("DIRETORIA");
    const res = await client.callTool({
      name: "reinstate_member",
      arguments: { memberId: MEMBER },
    });
    const data = parseResult(res);
    expect(data.status).toBe("ACTIVE");
  });

  it("rejects when memberId is empty string", async () => {
    const { client } = await connectAs("RESPONSAVEL_TECNICO");
    const res = await client.callTool({
      name: "reinstate_member",
      arguments: { memberId: "" },
    });
    const data = parseResult(res);
    expect(data.error).toBe("MISSING_MEMBER_ID");
  });

  it("surfaces domain error MEMBER_NOT_SUSPENDED when member is already ACTIVE", async () => {
    const { client, store } = await connectAs("RESPONSAVEL_TECNICO");
    // First reinstate — succeeds
    await client.callTool({
      name: "reinstate_member",
      arguments: { memberId: MEMBER },
    });
    // Second reinstate on now-ACTIVE member — domain rejects
    const res = await client.callTool({
      name: "reinstate_member",
      arguments: { memberId: MEMBER },
    });
    const data = parseResult(res);
    expect(data.error).toBe("MEMBER_NOT_SUSPENDED");
  });

  it("surfaces domain error MEMBER_NOT_SUSPENDED for unregistered memberId", async () => {
    const { client } = await connectAs("RESPONSAVEL_TECNICO");
    const res = await client.callTool({
      name: "reinstate_member",
      arguments: { memberId: "01HM0UNKNOWN0000000000001" },
    });
    const data = parseResult(res);
    expect(data.error).toBe("MEMBER_NOT_SUSPENDED");
  });

  it("AUDITOR cannot reinstate member (RBAC gate)", async () => {
    const { client } = await connectAs("AUDITOR");
    const res = await client.callTool({
      name: "reinstate_member",
      arguments: { memberId: MEMBER },
    });
    const data = parseResult(res);
    expect(data.error).toBe("ROLE_INSUFFICIENT");
  });

  it("rejects when no association context", async () => {
    const store = await setupSuspendedStore();
    const { server } = createCannaMcpServer({
      store,
      async resolveContext(): Promise<ToolContext> {
        return {
          store,
          userId: ACTOR,
          role: "RESPONSAVEL_TECNICO",
          associationId: "unknown",
          now: NOW,
        };
      },
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-no-assoc", version: "0.0.0" });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    const res = await client.callTool({
      name: "reinstate_member",
      arguments: { memberId: MEMBER },
    });
    const data = parseResult(res);
    expect(data.error).toBe("NO_ASSOCIATION_CONTEXT");
  });
});
