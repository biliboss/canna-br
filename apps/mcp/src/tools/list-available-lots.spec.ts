/**
 * list_available_lots — in-process smoke spec.
 *
 * Exercises the full MCP tool pipeline via InMemoryTransport (no LLM, no
 * network). Seeds inventory lots into the in-memory read-model, then asserts
 * the tool returns ONLY RELEASED lots scoped to the caller's association,
 * FIFO by producedAt. Pattern mirrors get-members-by-status.spec.ts.
 */
import { describe, it, expect } from "vitest";
import { createInMemoryEventStore } from "@canna/event-store";
import { asyncReadModel, createInMemoryStore } from "@canna/read-models";
import { type ULID } from "@canna/shared";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createCannaMcpServer } from "../server.js";
import { allTools } from "./index.js";
import type { ToolContext } from "../types.js";

const ASSOC = "01HM0ASSOC0000000000000001" as ULID;
const OTHER_ASSOC = "01HM0ASSOC0000000000000002" as ULID;
const ACTOR = "01HM0ACTOR0000000000000001" as ULID;
const NOW = new Date("2026-06-14T10:00:00Z");

const setupStore = () => {
  const store = createInMemoryEventStore();
  const seedStore = createInMemoryStore();
  const readModelStore = asyncReadModel(seedStore);

  // assoc-1: two RELEASED lots (different producedAt) + one QUARANTINED.
  seedStore.upsertInventoryLot({
    lotId: "lot-released-newer",
    associationId: ASSOC,
    productSku: "SKU-A",
    status: "RELEASED",
    initialQuantityG: "100.000",
    currentQuantityG: "80.000",
    producedAt: new Date("2026-05-10T00:00:00Z"),
    expiresAt: new Date("2027-05-10T00:00:00Z"),
  });
  seedStore.upsertInventoryLot({
    lotId: "lot-released-older",
    associationId: ASSOC,
    productSku: "SKU-B",
    status: "RELEASED",
    initialQuantityG: "50.000",
    currentQuantityG: "50.000",
    producedAt: new Date("2026-01-01T00:00:00Z"),
    expiresAt: new Date("2027-01-01T00:00:00Z"),
  });
  seedStore.upsertInventoryLot({
    lotId: "lot-quarantined",
    associationId: ASSOC,
    productSku: "SKU-C",
    status: "QUARANTINED",
    initialQuantityG: "30.000",
    currentQuantityG: "30.000",
    producedAt: new Date("2026-02-01T00:00:00Z"),
    expiresAt: new Date("2027-02-01T00:00:00Z"),
  });
  // other association: RELEASED lot — must not leak.
  seedStore.upsertInventoryLot({
    lotId: "lot-other-assoc",
    associationId: OTHER_ASSOC,
    productSku: "SKU-X",
    status: "RELEASED",
    initialQuantityG: "10.000",
    currentQuantityG: "10.000",
    producedAt: new Date("2026-03-01T00:00:00Z"),
    expiresAt: new Date("2027-03-01T00:00:00Z"),
  });

  return { store, readModelStore };
};

const connectAs = async (role: ToolContext["role"], associationId: ULID = ASSOC) => {
  const { store, readModelStore } = setupStore();
  const { server } = createCannaMcpServer({
    store,
    async resolveContext(): Promise<ToolContext> {
      return { store, readModelStore, userId: ACTOR, role, associationId, now: NOW };
    },
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-list-available-lots", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return { client };
};

const parseResult = (res: unknown): Record<string, unknown> => {
  const content = (res as { content: Array<{ text: string }> }).content;
  return JSON.parse(content[0]?.text ?? "{}") as Record<string, unknown>;
};

describe("@canna/mcp / list_available_lots — catalog", () => {
  it("is registered in allTools at Nível 1", () => {
    const tool = allTools.find((t) => t.name === "list_available_lots");
    expect(tool).toBeDefined();
    expect(tool?.riskLevel).toBe(1);
  });

  it("uiResourceUri points at inventory-lot-picker", () => {
    const tool = allTools.find((t) => t.name === "list_available_lots");
    expect(tool?.uiResourceUri).toBe("ui://inventory-lot-picker/app.html");
  });
});

describe("@canna/mcp / list_available_lots — smoke (in-process)", () => {
  it("returns only RELEASED lots for the association, FIFO by producedAt", async () => {
    const { client } = await connectAs("DISPENSADOR");
    const res = await client.callTool({ name: "list_available_lots", arguments: {} });
    const data = parseResult(res);

    expect(data.associationId).toBe(ASSOC);
    expect(data.totalCount).toBe(2);
    const lots = data.lots as Array<Record<string, unknown>>;
    // FIFO: older producedAt first; QUARANTINED excluded.
    expect(lots.map((l) => l.lotId)).toEqual(["lot-released-older", "lot-released-newer"]);
    expect(lots.every((l) => l.status === "RELEASED")).toBe(true);
    expect(lots[0]?.currentQuantityG).toBe("50.000");
  });

  it("does not leak lots from another association", async () => {
    const { client } = await connectAs("AUDITOR", OTHER_ASSOC);
    const res = await client.callTool({ name: "list_available_lots", arguments: {} });
    const data = parseResult(res);

    expect(data.totalCount).toBe(1);
    const lots = data.lots as Array<Record<string, unknown>>;
    expect(lots.map((l) => l.lotId)).toEqual(["lot-other-assoc"]);
  });

  it("GUEST role is denied (RBAC gate)", async () => {
    const { client } = await connectAs("GUEST");
    const res = await client.callTool({ name: "list_available_lots", arguments: {} });
    const data = parseResult(res);
    expect(data.error).toBe("ROLE_INSUFFICIENT");
  });

  it("returns READ_MODEL_STORE_UNAVAILABLE when readModelStore is absent", async () => {
    const store = createInMemoryEventStore();
    const { server } = createCannaMcpServer({
      store,
      async resolveContext(): Promise<ToolContext> {
        return { store, userId: ACTOR, role: "DISPENSADOR", associationId: ASSOC, now: NOW };
      },
    });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-no-store", version: "0.0.0" });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const res = await client.callTool({ name: "list_available_lots", arguments: {} });
    const data = parseResult(res);
    expect(data.error).toBe("READ_MODEL_STORE_UNAVAILABLE");
  });
});
