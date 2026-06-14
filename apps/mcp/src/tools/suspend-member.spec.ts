/**
 * suspend_member — in-process spec (bypasses LLM arg-collapse).
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

/** Setup store with an ACTIVE member ready for suspend_member. */
const setupActiveStore = async () => {
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
  return store;
};

const connectAs = async (role: ToolContext["role"]) => {
  const store = await setupActiveStore();
  const { server } = createCannaMcpServer({
    store,
    async resolveContext(): Promise<ToolContext> {
      return { store, userId: ACTOR, role, associationId: ASSOC, now: NOW };
    },
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-suspend-member", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, store };
};

const parseResult = (res: unknown): Record<string, unknown> => {
  const content = (res as { content: Array<{ text: string }> }).content;
  return JSON.parse(content[0]?.text ?? "{}") as Record<string, unknown>;
};

describe("@canna/mcp / suspend_member tool — catalog", () => {
  it("suspend_member is registered in allTools at Nível 3", () => {
    const tool = allTools.find((t) => t.name === "suspend_member");
    expect(tool).toBeDefined();
    expect(tool?.riskLevel).toBe(3);
    expect(tool?.allowedRoles).toContain("RESPONSAVEL_TECNICO");
    expect(tool?.allowedRoles).toContain("DIRETORIA");
    expect(tool?.uiResourceUri).toBe("ui://member-quota-card/app.html");
  });

  it("allTools now has 12 tools (5 read + 1 draft + 6 write)", () => {
    expect(allTools).toHaveLength(12);
    const byLevel = new Map<number, number>();
    for (const t of allTools) {
      byLevel.set(t.riskLevel, (byLevel.get(t.riskLevel) ?? 0) + 1);
    }
    expect(byLevel.get(1)).toBe(5);
    expect(byLevel.get(2)).toBe(1);
    expect(byLevel.get(3)).toBe(6);
  });
});

describe("@canna/mcp / suspend_member tool — handler (bypasses LLM)", () => {
  it("RESPONSAVEL_TECNICO suspends ACTIVE member → status SUSPENDED", async () => {
    const { client } = await connectAs("RESPONSAVEL_TECNICO");
    const res = await client.callTool({
      name: "suspend_member",
      arguments: { memberId: MEMBER, reason: "Pendência documental" },
    });
    const data = parseResult(res);
    expect(data.status).toBe("SUSPENDED");
    expect(data.memberId).toBe(MEMBER);
    expect(data.reason).toBe("Pendência documental");
    expect(data.suspendedBy).toBe(ACTOR);
    expect(data.nextStep).toBe("reinstate_member");
    expect(data.associationId).toBe(ASSOC);
  });

  it("DIRETORIA can also suspend a member", async () => {
    const { client } = await connectAs("DIRETORIA");
    const res = await client.callTool({
      name: "suspend_member",
      arguments: { memberId: MEMBER, reason: "Irregularidade auditoria" },
    });
    const data = parseResult(res);
    expect(data.status).toBe("SUSPENDED");
  });

  it("rejects when memberId is empty string", async () => {
    const { client } = await connectAs("RESPONSAVEL_TECNICO");
    const res = await client.callTool({
      name: "suspend_member",
      arguments: { memberId: "", reason: "Motivo qualquer" },
    });
    const data = parseResult(res);
    expect(data.error).toBe("MISSING_MEMBER_ID");
  });

  it("rejects when reason is empty string", async () => {
    const { client } = await connectAs("RESPONSAVEL_TECNICO");
    const res = await client.callTool({
      name: "suspend_member",
      arguments: { memberId: MEMBER, reason: "" },
    });
    const data = parseResult(res);
    expect(data.error).toBe("MISSING_REASON");
  });

  it("surfaces domain error MEMBER_NOT_ACTIVE when member is already SUSPENDED", async () => {
    const { client } = await connectAs("RESPONSAVEL_TECNICO");
    // First suspend
    await client.callTool({
      name: "suspend_member",
      arguments: { memberId: MEMBER, reason: "First suspension" },
    });
    // Second suspend on already SUSPENDED member
    const res = await client.callTool({
      name: "suspend_member",
      arguments: { memberId: MEMBER, reason: "Second suspension attempt" },
    });
    const data = parseResult(res);
    expect(data.error).toBe("MEMBER_NOT_ACTIVE");
  });

  it("surfaces domain error MEMBER_NOT_ACTIVE for unregistered memberId", async () => {
    const { client } = await connectAs("RESPONSAVEL_TECNICO");
    const res = await client.callTool({
      name: "suspend_member",
      arguments: { memberId: "01HM0UNKNOWN0000000000001", reason: "Test" },
    });
    const data = parseResult(res);
    expect(data.error).toBe("MEMBER_NOT_ACTIVE");
  });

  it("AUDITOR cannot suspend member (RBAC gate)", async () => {
    const { client } = await connectAs("AUDITOR");
    const res = await client.callTool({
      name: "suspend_member",
      arguments: { memberId: MEMBER, reason: "Tentativa indevida" },
    });
    const data = parseResult(res);
    expect(data.error).toBe("ROLE_INSUFFICIENT");
  });

  it("rejects when no association context", async () => {
    const store = await setupActiveStore();
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
      name: "suspend_member",
      arguments: { memberId: MEMBER, reason: "Test" },
    });
    const data = parseResult(res);
    expect(data.error).toBe("NO_ASSOCIATION_CONTEXT");
  });
});
