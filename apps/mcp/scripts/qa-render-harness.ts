/**
 * QA render harness — keyless, DB-less, LLM-less.
 *
 * Proves, at the widget layer, two release blockers end-to-end WITHOUT a
 * Postgres instance or an LLM API key:
 *
 *   blocker #1 — the MCP server's ReadResource serves the REAL widget HTML
 *                bundle over the wire (in-memory MCP Client ↔ Server pair).
 *   blocker #5 — get_member_quota returns REAL consumedG / remainingG (7 / 23),
 *                not 0, after a genuine RecordDispensation flows through the
 *                read-model projection.
 *
 * For each LAUNCHABLE widget (the 3 advertised by @canna/ui-apps; the withheld
 * member-lifecycle-board is asserted ABSENT from resources/list) it emits, into
 * /tmp/canna-qa/, the exact pair chrome-devtools needs to render live:
 *
 *   <widget>.html              — the real bundle text from resources/read
 *   <widget>.payload.json      — the tools/call result content (the JSON the
 *                                widget expects to receive)
 *   <widget>.postmessage.json  — the precise window.postMessage envelope that,
 *                                posted into the loaded iframe, makes the widget
 *                                render the seeded data.
 *
 * Run (matches apps/mcp `start` script style):
 *   node --experimental-strip-types apps/mcp/scripts/qa-render-harness.ts
 * or:
 *   pnpm --filter @canna/mcp exec tsx scripts/qa-render-harness.ts
 *
 * Wiring is copied verbatim from apps/mcp/src/server.spec.ts (in-memory event
 * store + InMemoryTransport.createLinkedPair + real createCannaMcpServer).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { createInMemoryEventStore } from "@canna/event-store";
import { Members, Lots, Dispensations } from "@canna/app-services";
import { isOk, quantityGrams, type ULID } from "@canna/shared";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createCannaMcpServer } from "../src/server.ts";
import type { ToolContext } from "../src/types.ts";

// --- Seed identities (mirror server.spec.ts) -------------------------------
const ASSOC = "01HM0ASSOC0000000000000001" as ULID;
const MEMBER = "01HM0MEMBER000000000000001" as ULID;
const LOT = "01HM0LOT00000000000000001" as ULID;
const DISPENSER = "01HM0DISP0R000000000000001" as ULID;
const PHYSICIAN = "01HM0PHYS00000000000000001" as ULID;
const PRESC = "01HM0PRESC0000000000000001" as ULID;
const ACTOR = "01HM0ACTOR0000000000000001" as ULID;
const DISPENSATION = "01HM0DISP0000000000000001" as ULID;
const NOW = new Date("2026-06-08T12:00:00Z");

const OUT_DIR = "/tmp/canna-qa";

const grams = (n: number) => {
  const r = quantityGrams(n);
  if (!isOk(r)) throw new Error(`bad grams: ${n}`);
  return r.value;
};

// --- Seed an in-memory event store via the REAL service commands -----------
// Same calls the production flow uses (RegisterMember → GrantConsent →
// ValidatePrescription → CreateLot → ReleaseLot → RecordDispensation) so the
// read-model projection that get_member_quota reads is genuine, not hand-built
// events. After this, consumedG=7 and remainingG=23 are projected, not faked.
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

  // Real dispensation: 7g against the 30g cap → consumedG=7, remainingG=23.
  const recorded = await Dispensations.recordDispensation(
    { store, responsavelTecnicoId: null, dispenserRole: "DISPENSADOR" },
    {
      type: "RecordDispensation",
      dispensationId: DISPENSATION,
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
    throw new Error(`seed dispensation failed: ${JSON.stringify(recorded)}`);
  }

  return store;
};

const dispenserCtx = (
  store: Awaited<ReturnType<typeof setupStore>>,
): ToolContext => ({
  store,
  userId: DISPENSER,
  role: "DISPENSADOR",
  associationId: ASSOC,
  now: NOW,
});

// --- Per-widget plan: which tool + args drive each launchable widget --------
// primaryToolName + required args read from packages/ui-apps/src/<widget>/index.ts
// and each tool's inputSchema in apps/mcp/src/tools/.
interface WidgetPlan {
  readonly id: string;
  readonly resourceUri: string;
  readonly toolName: string;
  readonly args: Record<string, unknown>;
}

const WIDGET_PLANS: readonly WidgetPlan[] = [
  {
    id: "member-quota-card",
    resourceUri: "ui://member-quota-card/app.html",
    toolName: "get_member_quota",
    args: { memberId: MEMBER },
  },
  {
    id: "traceability-timeline",
    resourceUri: "ui://traceability-timeline/app.html",
    toolName: "generate_traceability_report",
    args: { dispensationId: DISPENSATION },
  },
  {
    id: "dispensation-form",
    resourceUri: "ui://dispensation-form/app.html",
    toolName: "draft_dispensation",
    args: {
      associationId: ASSOC,
      memberId: MEMBER,
      lotId: LOT,
      quantityG: 5,
    },
  },
];

const WITHHELD_URI = "ui://member-lifecycle-board/app.html";

const EXPECTED_LAUNCHABLE_URIS = WIDGET_PLANS.map((p) => p.resourceUri).sort();

/**
 * Build the exact postMessage envelope each widget's `message` listener
 * consumes. Verified against packages/ui-apps/src/<widget>/main.ts — ALL three
 * widgets gate on `payload.type === "ui/notifications/tool-result"` and read
 * `payload.params.content[0].text` (a JSON string), then `JSON.parse` it.
 *
 * `_meta["ui/resourceUri"]` (SLASH key) is added for host→widget routing
 * fidelity; the listeners themselves do NOT key off it, but it mirrors the
 * documented host contract so chrome-devtools can target the right iframe.
 */
const buildPostMessageEnvelope = (
  resourceUri: string,
  toolResultContent: ReadonlyArray<{ type: string; text?: string }>,
) => ({
  type: "ui/notifications/tool-result",
  _meta: { "ui/resourceUri": resourceUri },
  params: {
    content: toolResultContent,
  },
});

const main = async () => {
  mkdirSync(OUT_DIR, { recursive: true });

  // --- Build the REAL server + an in-memory client (server.spec wiring) -----
  const store = await setupStore();
  const { server } = createCannaMcpServer({
    store,
    async resolveContext() {
      return dispenserCtx(store);
    },
  });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "qa-render-harness", version: "0.0.0" });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  // --- resources/list: assert 3 launchable present, board absent (bonus) ----
  const { resources } = await client.listResources();
  const advertisedUris = resources.map((r) => r.uri).sort();
  const launchableOk =
    JSON.stringify(advertisedUris) ===
    JSON.stringify(EXPECTED_LAUNCHABLE_URIS);
  const boardAbsent = !advertisedUris.includes(WITHHELD_URI);

  const written: string[] = [];
  const summary: Record<string, unknown> = {};

  for (const plan of WIDGET_PLANS) {
    // a) tools/call for the widget's primaryToolName with seeded IDs.
    const callResult = (await client.callTool({
      name: plan.toolName,
      arguments: plan.args,
    })) as {
      isError?: boolean;
      content: ReadonlyArray<{ type: string; text?: string }>;
    };

    if (callResult.isError === true) {
      throw new Error(
        `tools/call ${plan.toolName} errored: ${JSON.stringify(callResult.content)}`,
      );
    }

    // c) resources/read for the bundle HTML.
    const readResult = await client.readResource({ uri: plan.resourceUri });
    const first = readResult.contents[0];
    if (
      first === undefined ||
      !("text" in first) ||
      typeof first.text !== "string"
    ) {
      throw new Error(`resources/read ${plan.resourceUri} returned no text`);
    }
    const bundleHtml = first.text as string;

    // d) write the three scratch artifacts.
    const htmlPath = resolve(OUT_DIR, `${plan.id}.html`);
    const payloadPath = resolve(OUT_DIR, `${plan.id}.payload.json`);
    const postMessagePath = resolve(OUT_DIR, `${plan.id}.postmessage.json`);

    const envelope = buildPostMessageEnvelope(
      plan.resourceUri,
      callResult.content,
    );

    writeFileSync(htmlPath, bundleHtml, "utf8");
    writeFileSync(
      payloadPath,
      JSON.stringify(callResult.content, null, 2),
      "utf8",
    );
    writeFileSync(
      postMessagePath,
      JSON.stringify(envelope, null, 2),
      "utf8",
    );

    written.push(htmlPath, payloadPath, postMessagePath);

    // Parse the inner JSON for the summary (what the widget will render).
    const innerText = callResult.content[0]?.text;
    summary[plan.id] = {
      tool: plan.toolName,
      bundleBytes: bundleHtml.length,
      payload: innerText !== undefined ? JSON.parse(innerText) : null,
    };
  }

  // --- Report ---------------------------------------------------------------
  const line = "=".repeat(72);
  console.log(line);
  console.log("CANNA QA RENDER HARNESS — keyless / DB-less / LLM-less");
  console.log(line);

  console.log("\n[resources/list]");
  console.log(`  advertised launchable URIs: ${JSON.stringify(advertisedUris)}`);
  console.log(`  3 launchable present:        ${launchableOk ? "PASS" : "FAIL"}`);
  console.log(
    `  member-lifecycle-board absent: ${boardAbsent ? "PASS" : "FAIL"} (${WITHHELD_URI})`,
  );

  console.log("\n[blocker #5 — member-quota-card real consumedG]");
  const quota = (summary["member-quota-card"] as { payload: Record<string, unknown> })
    .payload;
  console.log(JSON.stringify(quota, null, 2));
  const consumedOk = quota["consumedG"] === 7 && quota["remainingG"] === 23;
  console.log(
    `  consumedG===7 && remainingG===23: ${consumedOk ? "PASS" : "FAIL"}`,
  );

  console.log("\n[files written to /tmp/canna-qa/]");
  for (const f of written) console.log(`  ${f}`);

  console.log("\n[postMessage envelope shape — per widget]");
  for (const plan of WIDGET_PLANS) {
    console.log(`  ${plan.id}:`);
    console.log(
      "    " +
        JSON.stringify({
          type: "ui/notifications/tool-result",
          _meta: { "ui/resourceUri": plan.resourceUri },
          params: { content: "[{ type:'text', text:'<tool-result JSON>' }]" },
        }),
    );
  }

  console.log("\n" + line);
  const allPass = launchableOk && boardAbsent && consumedOk;
  console.log(`OVERALL: ${allPass ? "PASS" : "FAIL"}`);
  console.log(line);

  await client.close();
  await server.close();

  if (!allPass) process.exit(1);
};

main().catch((e) => {
  console.error("[qa-render-harness] FATAL:", e);
  process.exit(1);
});
