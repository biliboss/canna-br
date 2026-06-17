/**
 * revoke_consent — in-process spec (bypasses LLM arg-collapse).
 *
 * LGPD direito de retirada do consentimento. Uses InMemoryTransport so the full
 * MCP tool pipeline executes (RBAC gate → handler → domain → event-store).
 * Domain transition: ACTIVE → SUSPENDED (consentVersion cleared).
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

/** Setup store with an ACTIVE member (registered + consent granted). */
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
  const client = new Client({ name: "test-revoke-consent", version: "0.0.0" });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return { client, store };
};

const parseResult = (res: unknown): Record<string, unknown> => {
  const content = (res as { content: Array<{ text: string }> }).content;
  return JSON.parse(content[0]?.text ?? "{}") as Record<string, unknown>;
};

describe("@canna/mcp / revoke_consent tool — catalog", () => {
  it("revoke_consent is registered at Nível 3 with LGPD roles", () => {
    const tool = allTools.find((t) => t.name === "revoke_consent");
    expect(tool).toBeDefined();
    expect(tool?.riskLevel).toBe(3);
    expect(tool?.allowedRoles).toContain("RESPONSAVEL_TECNICO");
    expect(tool?.allowedRoles).toContain("DIRETORIA");
    expect(tool?.allowedRoles).toContain("DPO");
  });
});

describe("@canna/mcp / revoke_consent tool — handler (bypasses LLM)", () => {
  it("DPO revokes consent → member transitions to SUSPENDED", async () => {
    const { client } = await connectAs("DPO");
    const res = await client.callTool({
      name: "revoke_consent",
      arguments: { memberId: MEMBER },
    });
    const data = parseResult(res);
    expect(data.status).toBe("SUSPENDED");
    expect(data.consentRevoked).toBe(true);
    expect(data.memberId).toBe(MEMBER);
    expect(data.revokedBy).toBe(ACTOR);
  });

  it("rejects when memberId is empty string", async () => {
    const { client } = await connectAs("DPO");
    const res = await client.callTool({
      name: "revoke_consent",
      arguments: { memberId: "" },
    });
    const data = parseResult(res);
    expect(data.error).toBe("MISSING_MEMBER_ID");
  });

  it("AUDITOR cannot revoke consent (RBAC gate)", async () => {
    const { client } = await connectAs("AUDITOR");
    const res = await client.callTool({
      name: "revoke_consent",
      arguments: { memberId: MEMBER },
    });
    const data = parseResult(res);
    expect(data.error).toBe("ROLE_INSUFFICIENT");
  });

  it("surfaces domain error for unknown member", async () => {
    const { client } = await connectAs("DPO");
    const res = await client.callTool({
      name: "revoke_consent",
      arguments: { memberId: "01HM0UNKNOWN0000000000001" },
    });
    const data = parseResult(res);
    expect(data.error).toBeDefined();
    expect(data.status).toBeUndefined();
  });
});
