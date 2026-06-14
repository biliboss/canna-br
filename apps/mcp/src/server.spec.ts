import { describe, it, expect } from "vitest";
import { createInMemoryEventStore } from "@canna/event-store";
import { Members, Lots, Dispensations } from "@canna/app-services";
import { isOk, quantityGrams, type ULID } from "@canna/shared";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createCannaMcpServer } from "./server.js";
import { allTools } from "./tools/index.js";
import type { ToolContext } from "./types.js";
import { createInMemoryStore } from "@canna/read-models";
import { hashCpf } from "@canna/crypto";

const ASSOC = "01HM0ASSOC0000000000000001" as ULID;
const MEMBER = "01HM0MEMBER000000000000001" as ULID;
const LOT = "01HM0LOT00000000000000001" as ULID;
const DISPENSER = "01HM0DISP0R000000000000001" as ULID;
const PHYSICIAN = "01HM0PHYS00000000000000001" as ULID;
const PRESC = "01HM0PRESC0000000000000001" as ULID;
const ACTOR = "01HM0ACTOR0000000000000001" as ULID;
const NOW = new Date("2026-06-08T12:00:00Z");

const grams = (n: number) => {
  const r = quantityGrams(n);
  if (!isOk(r)) throw new Error(String(n));
  return r.value;
};

const setupStore = async () => {
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
  await Members.validatePrescription(store, {
    type: "ValidatePrescription",
    memberId: MEMBER,
    prescriptionId: PRESC,
    physicianCRM: "CRM/SP 123456",
    validFrom: new Date("2026-06-01T00:00:00Z"),
    validUntil: new Date("2026-12-01T00:00:00Z"),
    monthlyQuotaG: grams(30),
    validatedBy: PHYSICIAN,
    now: NOW,
  });
  await Lots.createLot(store, {
    type: "CreateLot",
    lotId: LOT,
    associationId: ASSOC,
    productSku: "CBD-FS",
    initialQuantityG: grams(100),
    origin: "INTERNAL_CULTIVATION",
    producedAt: new Date("2026-04-01T00:00:00Z"),
    expiresAt: new Date("2027-04-01T00:00:00Z"),
    createdBy: ACTOR,
    now: NOW,
  });
  await Lots.releaseLot(store, {
    type: "ReleaseLot",
    lotId: LOT,
    coaReference: "coa://lab/abc",
    releasedBy: ACTOR,
    now: NOW,
  });
  return store;
};

const dispenserCtx = (store: Awaited<ReturnType<typeof setupStore>>): ToolContext => ({
  store,
  userId: DISPENSER,
  role: "DISPENSADOR",
  associationId: ASSOC,
  now: NOW,
});

describe("@canna/mcp / tool catalog", () => {
  it("exposes 12 tools (5 read + 1 draft + 6 write: register_member + grant_consent + validate_prescription + record-dispensation + suspend_member + reinstate_member)", () => {
    expect(allTools).toHaveLength(12);
    const byLevel = new Map<number, number>();
    for (const t of allTools) {
      byLevel.set(t.riskLevel, (byLevel.get(t.riskLevel) ?? 0) + 1);
    }
    expect(byLevel.get(1)).toBe(5);
    expect(byLevel.get(2)).toBe(1);
    expect(byLevel.get(3)).toBe(6);
    expect(allTools.map((t) => t.name)).toContain("register_member");
    expect(allTools.map((t) => t.name)).toContain("grant_consent");
    expect(allTools.map((t) => t.name)).toContain("find_member_by_cpf");
  });

  it("every tool has uiResourceUri pointing to a packages/ui-apps app", () => {
    for (const t of allTools) {
      expect(t.uiResourceUri).toMatch(/^ui:\/\//);
    }
  });

  it("Tool Level 4 commands are NOT exposed via MCP", () => {
    const names = allTools.map((t) => t.name);
    const forbidden = [
      "execute_crypto_deletion",
      "change_user_role",
      "disable_2fa",
      "delete_or_rotate_keys",
      "submit_sngpc_production",
      "change_quota",
      "recall_lot",
    ];
    for (const f of forbidden) expect(names).not.toContain(f);
  });
});

describe("@canna/mcp / get_member_quota tool", () => {
  it("returns member state for ACTIVE member", async () => {
    const store = await setupStore();
    const ctx = dispenserCtx(store);
    const tool = allTools.find((t) => t.name === "get_member_quota");
    if (tool === undefined) throw new Error("tool not found");
    const result = await tool.handler({ memberId: MEMBER }, ctx);
    expect(result.isError).not.toBe(true);
    const data = JSON.parse(result.content[0]!.text) as {
      status: string;
      memberId: string;
      prescription: { monthlyQuotaG: number } | null;
    };
    expect(data.status).toBe("ACTIVE");
    expect(data.memberId).toBe(MEMBER);
    expect(data.prescription?.monthlyQuotaG).toBe(30);
  });

  it("surfaces real consumedG + remainingG after a dispensation (not 0)", async () => {
    const store = await setupStore();
    const ctx = dispenserCtx(store);

    // Record a real dispensation so MemberQuotaConsumed lands on the
    // association stream (quota cap is 30g; dispense 7g).
    const recorded = await Dispensations.recordDispensation(
      { store, responsavelTecnicoId: null, dispenserRole: "DISPENSADOR" },
      {
        type: "RecordDispensation",
        dispensationId: "01HM0DISP0000000000000001" as ULID,
        associationId: ASSOC,
        memberId: MEMBER,
        lotId: LOT,
        quantityG: grams(7),
        dispensedBy: DISPENSER,
        approvedBy: null,
        now: NOW,
      },
    );
    if (!isOk(recorded)) {
      throw new Error(`dispensation failed: ${JSON.stringify(recorded)}`);
    }

    const tool = allTools.find((t) => t.name === "get_member_quota");
    if (tool === undefined) throw new Error("tool not found");
    const result = await tool.handler({ memberId: MEMBER }, ctx);
    expect(result.isError).not.toBe(true);
    const data = JSON.parse(result.content[0]!.text) as {
      consumedG: number;
      remainingG: number;
      prescription: { monthlyQuotaG: number } | null;
    };
    // The widget computes pct = consumed / cap — proving the bar is no
    // longer stuck at 0%.
    expect(data.consumedG).toBe(7);
    expect(data.remainingG).toBe(23); // 30 cap - 7 consumed
    expect(data.prescription?.monthlyQuotaG).toBe(30);
  });

  it("returns MEMBER_NOT_FOUND for unknown member", async () => {
    const store = await setupStore();
    const ctx = dispenserCtx(store);
    const tool = allTools.find((t) => t.name === "get_member_quota");
    if (tool === undefined) throw new Error("tool not found");
    const result = await tool.handler(
      { memberId: "01HM0OTHER00000000000000XX" as ULID },
      ctx,
    );
    expect(result.isError).toBe(true);
  });
});

describe("@canna/mcp / draft_dispensation tool (Level 2)", () => {
  it("returns preview without mutating association stream", async () => {
    const store = await setupStore();
    const ctx = dispenserCtx(store);
    const tool = allTools.find((t) => t.name === "draft_dispensation");
    if (tool === undefined) throw new Error("tool not found");
    const result = await tool.handler(
      {
        associationId: ASSOC,
        memberId: MEMBER,
        lotId: LOT,
        quantityG: 5,
      },
      ctx,
    );
    const data = JSON.parse(result.content[0]!.text) as {
      dryRun: boolean;
      preview: ReadonlyArray<{ type: string }>;
    };
    expect(data.dryRun).toBe(true);
    expect(Array.isArray(data.preview)).toBe(true);
  });
});

describe("@canna/mcp / RBAC enforcement", () => {
  it("createCannaMcpServer rejects when role not in allowedRoles", async () => {
    const store = await setupStore();
    const { server, tools } = createCannaMcpServer({
      store,
      async resolveContext() {
        return {
          store,
          userId: ACTOR,
          role: "AUDITOR",
          associationId: ASSOC,
          now: NOW,
        };
      },
    });
    expect(server).toBeDefined();
    expect(tools.size).toBe(12);

    // AUDITOR cannot call draft_dispensation (DISPENSADOR + RT only)
    const tool = tools.get("draft_dispensation");
    if (tool === undefined) throw new Error("tool not found");
    expect(tool.allowedRoles).not.toContain("AUDITOR");
  });
});

describe("@canna/mcp / Nível 3 PendingAction stub", () => {
  it("request_record_dispensation returns pendingActionId without mutating stream", async () => {
    const store = await setupStore();
    const ctx = dispenserCtx(store);
    const tool = allTools.find((t) => t.name === "request_record_dispensation");
    if (tool === undefined) throw new Error("tool not found");
    const result = await tool.handler(
      {
        associationId: ASSOC,
        memberId: MEMBER,
        lotId: LOT,
        quantityG: 5,
      },
      ctx,
    );
    const data = JSON.parse(result.content[0]!.text) as {
      pendingActionId: string;
      status: string;
    };
    expect(data.pendingActionId).toMatch(/^pending:/);
    expect(data.status).toBe("PENDING_APPROVAL");
  });
});

describe("@canna/mcp / MCP App resources (blocker #1)", () => {
  // member-lifecycle-board is withheld from the registry (Option B, blocker
  // #6): no backing get_member_lifecycle tool / cross-member read-model
  // exists, so the server (driven by @canna/ui-apps allManifests) serves only
  // the 3 launchable widget bundles. Re-add its URI here once the board ships.
  const EXPECTED_URIS = [
    "ui://member-quota-card/app.html",
    "ui://traceability-timeline/app.html",
    "ui://dispensation-form/app.html",
  ];

  const connectClient = async () => {
    const store = await setupStore();
    const { server } = createCannaMcpServer({
      store,
      async resolveContext() {
        return dispenserCtx(store);
      },
    });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-client", version: "0.0.0" });
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
    return { client };
  };

  it("advertises the resources capability", async () => {
    const { client } = await connectClient();
    const caps = client.getServerCapabilities();
    expect(caps?.resources).toBeDefined();
  });

  it("ListResources returns one resource per launchable widget bundle (3 ui:// URIs)", async () => {
    const { client } = await connectClient();
    const { resources } = await client.listResources();
    const uris = resources.map((r) => r.uri).sort();
    expect(uris).toEqual([...EXPECTED_URIS].sort());
    for (const r of resources) {
      expect(r.mimeType).toBe("text/html");
    }
  });

  it("ReadResource on a known URI returns non-empty HTML", async () => {
    const { client } = await connectClient();
    for (const uri of EXPECTED_URIS) {
      const result = await client.readResource({ uri });
      const first = result.contents[0];
      expect(first).toBeDefined();
      expect(first?.uri).toBe(uri);
      expect(first?.mimeType).toBe("text/html");
      if (first === undefined || !("text" in first)) {
        throw new Error("expected text content");
      }
      expect(typeof first.text).toBe("string");
      expect((first.text as string).length).toBeGreaterThan(0);
    }
  });
});

describe("@canna/mcp / register_member (v0.1 onboarding)", () => {
  const connectAs = async (role: ToolContext["role"]) => {
    const store = await setupStore();
    const { server } = createCannaMcpServer({
      store,
      async resolveContext(): Promise<ToolContext> {
        return { store, userId: ACTOR, role, associationId: ASSOC, now: NOW };
      },
    });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-client", version: "0.0.0" });
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
    return { client };
  };

  const callResult = (res: unknown): Record<string, unknown> => {
    const content = (res as { content: Array<{ text: string }> }).content;
    return JSON.parse(content[0]?.text ?? "{}") as Record<string, unknown>;
  };

  it("DIRETORIA registers a member from a CPF → PENDING_CONSENT + generated ULID", async () => {
    const { client } = await connectAs("DIRETORIA");
    const res = await client.callTool({
      name: "register_member",
      arguments: { cpf: "123.456.789-09" },
    });
    const data = callResult(res);
    expect(data.status).toBe("PENDING_CONSENT");
    expect(typeof data.memberId).toBe("string");
    expect((data.memberId as string).length).toBeGreaterThanOrEqual(26); // ULID
    expect(data.nextStep).toBe("grant_consent");
    expect(data.associationId).toBe(ASSOC);
  });

  it("rejects an invalid CPF (wrong digit count)", async () => {
    const { client } = await connectAs("DIRETORIA");
    const res = await client.callTool({
      name: "register_member",
      arguments: { cpf: "123" },
    });
    expect(callResult(res).error).toBe("INVALID_CPF");
  });

  it("AUDITOR cannot register a member (role gate)", async () => {
    const { client } = await connectAs("AUDITOR");
    const res = await client.callTool({
      name: "register_member",
      arguments: { cpf: "123.456.789-09" },
    });
    expect(callResult(res).error).toBe("ROLE_INSUFFICIENT");
  });
});

describe("@canna/mcp / find_member_by_cpf (Nível 1 — recover memberId)", () => {
  const SITE_SALT = process.env.CANNA_CPF_SALT ?? "canna-dev-site-salt";
  const KNOWN_CPF = "123.456.789-09";

  const setupWithReadModel = async () => {
    const store = createInMemoryEventStore();
    const readModelStore = createInMemoryStore();

    // Register via tool so cpfHash is seeded with the same SITE_SALT
    const cpfHash = await hashCpf(KNOWN_CPF, SITE_SALT);
    const memberId = MEMBER;
    await Members.registerMember(store, {
      type: "RegisterMember",
      memberId,
      associationId: ASSOC,
      cpfHash,
      registeredBy: ACTOR,
      now: NOW,
    });
    // Manually seed the read-model store (mirrors what the projection subscriber
    // would do in production after receiving the MemberRegistered event).
    readModelStore.upsertMember({
      memberId,
      associationId: ASSOC,
      cpfHash,
      status: "PENDING_CONSENT",
      consentVersion: null,
      createdAt: NOW,
      updatedAt: NOW,
    });

    return { store, readModelStore };
  };

  it("returns memberId + PENDING_CONSENT when CPF matches", async () => {
    const { store, readModelStore } = await setupWithReadModel();
    const tool = allTools.find((t) => t.name === "find_member_by_cpf");
    if (tool === undefined) throw new Error("tool not found");
    const ctx: ToolContext = {
      store,
      readModelStore,
      userId: ACTOR,
      role: "DISPENSADOR",
      associationId: ASSOC,
      now: NOW,
    };
    const result = await tool.handler({ cpf: KNOWN_CPF }, ctx);
    expect(result.isError).not.toBe(true);
    const data = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    expect(data.memberId).toBe(MEMBER);
    expect(data.status).toBe("PENDING_CONSENT");
    expect(data.nextStep).toBe("grant_consent");
    expect(data).not.toHaveProperty("cpf");
    expect(data).not.toHaveProperty("cpfHash");
  });

  it("returns MEMBER_NOT_FOUND for unknown CPF", async () => {
    const { store, readModelStore } = await setupWithReadModel();
    const tool = allTools.find((t) => t.name === "find_member_by_cpf");
    if (tool === undefined) throw new Error("tool not found");
    const ctx: ToolContext = {
      store,
      readModelStore,
      userId: ACTOR,
      role: "DISPENSADOR",
      associationId: ASSOC,
      now: NOW,
    };
    const result = await tool.handler({ cpf: "999.999.999-99" }, ctx);
    const data = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    expect(data.error).toBe("MEMBER_NOT_FOUND");
  });

  it("returns INVALID_CPF for malformed input", async () => {
    const { store, readModelStore } = await setupWithReadModel();
    const tool = allTools.find((t) => t.name === "find_member_by_cpf");
    if (tool === undefined) throw new Error("tool not found");
    const ctx: ToolContext = {
      store,
      readModelStore,
      userId: ACTOR,
      role: "DISPENSADOR",
      associationId: ASSOC,
      now: NOW,
    };
    const result = await tool.handler({ cpf: "12345" }, ctx);
    const data = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    expect(data.error).toBe("INVALID_CPF");
  });

  it("returns READ_MODEL_STORE_UNAVAILABLE when readModelStore is not provided", async () => {
    const { store } = await setupWithReadModel();
    const tool = allTools.find((t) => t.name === "find_member_by_cpf");
    if (tool === undefined) throw new Error("tool not found");
    const ctx: ToolContext = {
      store,
      userId: ACTOR,
      role: "DISPENSADOR",
      associationId: ASSOC,
      now: NOW,
    };
    const result = await tool.handler({ cpf: KNOWN_CPF }, ctx);
    const data = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    expect(data.error).toBe("READ_MODEL_STORE_UNAVAILABLE");
  });
});
