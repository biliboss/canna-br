/**
 * grant_consent — in-process spec (bypasses LLM arg-collapse).
 *
 * Tests use InMemoryTransport so the full MCP tool pipeline executes
 * (RBAC gate → handler → domain → event-store) without a running server.
 * This is the same pattern used for register_member in server.spec.ts.
 *
 * Live HTTP smoke (requires server on :3001):
 *   pnpm --filter @canna/mcp exec tsx scripts/qa-call-grant-consent.ts
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
const NOW = new Date("2026-06-08T12:00:00Z");

/** Setup store with a PENDING_CONSENT member ready for grant_consent. */
const setupPendingStore = async () => {
  const store = createInMemoryEventStore();
  await Members.registerMember(store, {
    type: "RegisterMember",
    memberId: MEMBER,
    associationId: ASSOC,
    cpfHash: "sha256:test",
    registeredBy: ACTOR,
    now: NOW,
  });
  return store;
};

const connectAs = async (role: ToolContext["role"]) => {
  const store = await setupPendingStore();
  const { server } = createCannaMcpServer({
    store,
    async resolveContext(): Promise<ToolContext> {
      return { store, userId: ACTOR, role, associationId: ASSOC, now: NOW };
    },
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-grant-consent", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client, store };
};

const parseResult = (res: unknown): Record<string, unknown> => {
  const content = (res as { content: Array<{ text: string }> }).content;
  return JSON.parse(content[0]?.text ?? "{}") as Record<string, unknown>;
};

describe("@canna/mcp / grant_consent tool — catalog", () => {
  it("grant_consent is registered in allTools at Nível 3", () => {
    const tool = allTools.find((t) => t.name === "grant_consent");
    expect(tool).toBeDefined();
    expect(tool?.riskLevel).toBe(3);
    expect(tool?.allowedRoles).toContain("RESPONSAVEL_TECNICO");
    expect(tool?.allowedRoles).toContain("DIRETORIA");
    expect(tool?.uiResourceUri).toBe("ui://member-quota-card/app.html");
  });

  it("allTools now has 14 tools (5 read + 1 draft + 8 write)", () => {
    expect(allTools).toHaveLength(14);
    const byLevel = new Map<number, number>();
    for (const t of allTools) {
      byLevel.set(t.riskLevel, (byLevel.get(t.riskLevel) ?? 0) + 1);
    }
    expect(byLevel.get(1)).toBe(5);
    expect(byLevel.get(2)).toBe(1);
    expect(byLevel.get(3)).toBe(8);
  });
});

describe("@canna/mcp / grant_consent tool — handler (bypasses LLM)", () => {
  it("RESPONSAVEL_TECNICO grants consent → member transitions to ACTIVE", async () => {
    const { client } = await connectAs("RESPONSAVEL_TECNICO");
    const res = await client.callTool({
      name: "grant_consent",
      arguments: { memberId: MEMBER },
    });
    const data = parseResult(res);
    expect(data.status).toBe("ACTIVE");
    expect(data.memberId).toBe(MEMBER);
    expect(data.consentVersion).toBe(1);
    expect(data.nextStep).toBe("validate_prescription");
    expect(data.associationId).toBe(ASSOC);
  });

  it("DIRETORIA grants consent with explicit consentVersion", async () => {
    const { client } = await connectAs("DIRETORIA");
    const res = await client.callTool({
      name: "grant_consent",
      arguments: { memberId: MEMBER, consentVersion: 1 },
    });
    const data = parseResult(res);
    expect(data.status).toBe("ACTIVE");
    expect(data.consentVersion).toBe(1);
  });

  it("rejects when memberId is empty string", async () => {
    const { client } = await connectAs("RESPONSAVEL_TECNICO");
    const res = await client.callTool({
      name: "grant_consent",
      arguments: { memberId: "" },
    });
    const data = parseResult(res);
    expect(data.error).toBe("MISSING_MEMBER_ID");
  });

  it("surfaces domain error MEMBER_NOT_REGISTERED for unknown memberId", async () => {
    const { client } = await connectAs("RESPONSAVEL_TECNICO");
    const res = await client.callTool({
      name: "grant_consent",
      arguments: { memberId: "01HM0UNKNOWN0000000000001" },
    });
    const data = parseResult(res);
    expect(data.error).toBe("MEMBER_NOT_REGISTERED");
  });

  it("surfaces domain error CONSENT_ALREADY_GRANTED on duplicate consent", async () => {
    // First grant — should succeed
    const { client } = await connectAs("RESPONSAVEL_TECNICO");
    await client.callTool({
      name: "grant_consent",
      arguments: { memberId: MEMBER, consentVersion: 1 },
    });
    // Second grant at the same version — domain rejects
    const res = await client.callTool({
      name: "grant_consent",
      arguments: { memberId: MEMBER, consentVersion: 1 },
    });
    const data = parseResult(res);
    expect(data.error).toBe("CONSENT_ALREADY_GRANTED");
  });

  it("AUDITOR cannot grant consent (RBAC gate)", async () => {
    const { client } = await connectAs("AUDITOR");
    const res = await client.callTool({
      name: "grant_consent",
      arguments: { memberId: MEMBER },
    });
    const data = parseResult(res);
    expect(data.error).toBe("ROLE_INSUFFICIENT");
  });

  it("rejects when no association context", async () => {
    const store = await setupPendingStore();
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
      name: "grant_consent",
      arguments: { memberId: MEMBER },
    });
    const data = parseResult(res);
    expect(data.error).toBe("NO_ASSOCIATION_CONTEXT");
  });
});
