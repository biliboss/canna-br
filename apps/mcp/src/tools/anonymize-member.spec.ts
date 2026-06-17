/**
 * anonymize_member — in-process spec (bypasses LLM arg-collapse).
 *
 * LGPD Art. 18 IV crypto-delete. Uses InMemoryTransport so the full MCP tool
 * pipeline executes (RBAC gate → handler → domain → event-store).
 * Asserts the member transitions to ANONYMIZED and cpfHash is erased.
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

/** Setup store with a registered (PENDING_CONSENT) member. */
const setupRegisteredStore = async () => {
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
  const store = await setupRegisteredStore();
  const { server } = createCannaMcpServer({
    store,
    async resolveContext(): Promise<ToolContext> {
      return { store, userId: ACTOR, role, associationId: ASSOC, now: NOW };
    },
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-anonymize-member", version: "0.0.0" });
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

describe("@canna/mcp / anonymize_member tool — catalog", () => {
  it("anonymize_member is registered at Nível 3 with DPO/DIRETORIA roles", () => {
    const tool = allTools.find((t) => t.name === "anonymize_member");
    expect(tool).toBeDefined();
    expect(tool?.riskLevel).toBe(3);
    expect(tool?.allowedRoles).toContain("DPO");
    expect(tool?.allowedRoles).toContain("DIRETORIA");
    // erasure is privileged — the technical lead must NOT be able to call it
    expect(tool?.allowedRoles).not.toContain("RESPONSAVEL_TECNICO");
  });
});

describe("@canna/mcp / anonymize_member tool — handler (bypasses LLM)", () => {
  it("DPO anonymizes → ANONYMIZED + cpfHash erased", async () => {
    const { client, store } = await connectAs("DPO");
    const res = await client.callTool({
      name: "anonymize_member",
      arguments: { memberId: MEMBER },
    });
    const data = parseResult(res);
    expect(data.status).toBe("ANONYMIZED");
    expect(data.cpfHashErased).toBe(true);
    expect(data.irreversible).toBe(true);
    expect(data.reason).toBe("LGPD_ART_18_IV");

    // Independently confirm against the event-store projection.
    const { state } = await Members.loadMemberState(store, MEMBER);
    expect(state.status).toBe("ANONYMIZED");
    expect(state.cpfHash).toBeNull();
  });

  it("DIRETORIA anonymizes with explicit retention reason", async () => {
    const { client } = await connectAs("DIRETORIA");
    const res = await client.callTool({
      name: "anonymize_member",
      arguments: { memberId: MEMBER, reason: "INACTIVE_RETENTION_EXPIRED" },
    });
    const data = parseResult(res);
    expect(data.status).toBe("ANONYMIZED");
    expect(data.reason).toBe("INACTIVE_RETENTION_EXPIRED");
  });

  it("rejects when memberId is empty string", async () => {
    const { client } = await connectAs("DPO");
    const res = await client.callTool({
      name: "anonymize_member",
      arguments: { memberId: "" },
    });
    const data = parseResult(res);
    expect(data.error).toBe("MISSING_MEMBER_ID");
  });

  it("RESPONSAVEL_TECNICO cannot anonymize (RBAC gate)", async () => {
    const { client } = await connectAs("RESPONSAVEL_TECNICO");
    const res = await client.callTool({
      name: "anonymize_member",
      arguments: { memberId: MEMBER },
    });
    const data = parseResult(res);
    expect(data.error).toBe("ROLE_INSUFFICIENT");
  });

  it("surfaces domain error MEMBER_NOT_REGISTERED for unknown member", async () => {
    const { client } = await connectAs("DPO");
    const res = await client.callTool({
      name: "anonymize_member",
      arguments: { memberId: "01HM0UNKNOWN0000000000001" },
    });
    const data = parseResult(res);
    expect(data.error).toBe("MEMBER_NOT_REGISTERED");
  });
});
