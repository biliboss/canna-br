import { describe, it, expect, afterEach } from "vitest";
import { createInMemoryEventStore } from "@canna/event-store";
import { Members, Lots } from "@canna/app-services";
import { isOk, quantityGrams, type ULID } from "@canna/shared";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createCannaMcpServer } from "./server.js";
import type { ToolContext } from "./types.js";
import {
  setSink,
  resetSink,
  type ToolSpan,
  type TelemetrySink,
} from "./telemetry.js";

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

const fakeSink = () => {
  const spans: ToolSpan[] = [];
  const sink: TelemetrySink = { record: (s) => spans.push(s) };
  return { spans, sink };
};

const connectAs = async (
  ctx: (store: Awaited<ReturnType<typeof setupStore>>) => ToolContext,
) => {
  const store = await setupStore();
  const { server } = createCannaMcpServer({
    store,
    async resolveContext() {
      return ctx(store);
    },
  });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([server.connect(st), client.connect(ct)]);
  return { client };
};

describe("@canna/mcp / telemetry — tool calls emit spans", () => {
  afterEach(() => resetSink());

  it("emits an ok:true span with {tool, role, associationId, latencyMs} for a successful call", async () => {
    const { spans, sink } = fakeSink();
    setSink(sink);
    const { client } = await connectAs((store) => ({
      store,
      userId: DISPENSER,
      role: "DISPENSADOR",
      associationId: ASSOC,
      now: NOW,
    }));

    await client.callTool({
      name: "get_member_quota",
      arguments: { memberId: MEMBER },
    });

    expect(spans).toHaveLength(1);
    const s = spans[0]!;
    expect(s.tool).toBe("get_member_quota");
    expect(s.role).toBe("DISPENSADOR");
    expect(s.associationId).toBe(ASSOC);
    expect(s.ok).toBe(true);
    expect(typeof s.latencyMs).toBe("number");
    expect(s.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("emits ok:false + error code for a DOMAIN error (returned isError, not thrown)", async () => {
    const { spans, sink } = fakeSink();
    setSink(sink);
    const { client } = await connectAs((store) => ({
      store,
      userId: DISPENSER,
      role: "DISPENSADOR",
      associationId: ASSOC,
      now: NOW,
    }));

    await client.callTool({
      name: "get_member_quota",
      arguments: { memberId: "01HM0OTHER00000000000000XX" },
    });

    expect(spans).toHaveLength(1);
    expect(spans[0]!.ok).toBe(false);
  });

  it("emits ok:false ROLE_INSUFFICIENT span when role is gated (pre-handler exit)", async () => {
    const { spans, sink } = fakeSink();
    setSink(sink);
    const { client } = await connectAs((store) => ({
      store,
      userId: ACTOR,
      role: "AUDITOR",
      associationId: ASSOC,
      now: NOW,
    }));

    await client.callTool({
      name: "register_member",
      arguments: { cpf: "123.456.789-09" },
    });

    expect(spans).toHaveLength(1);
    const s = spans[0]!;
    expect(s.tool).toBe("register_member");
    expect(s.role).toBe("AUDITOR");
    expect(s.ok).toBe(false);
    expect(s.error).toBe("ROLE_INSUFFICIENT");
  });
});
