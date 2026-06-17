import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Role-gating proof for the member-lifecycle-board lifecycle action buttons.
 *
 * Loads the REAL shipped bundle (dist/member-lifecycle-board.html) into jsdom
 * with runScripts:"dangerously", then drives the actual MCP App bridge by
 * posting a `ui/notifications/tool-result` envelope (the same path the host
 * uses at runtime, app.html:1552). This exercises the shipped `render` — no
 * duplicated gating matrix — so a green here is a green for the artifact.
 */

const HERE = fileURLToPath(new URL(".", import.meta.url));
const PKG_ROOT = resolve(HERE, "..", "..");
const BUNDLE = resolve(PKG_ROOT, "dist", "member-lifecycle-board.html");

const BASE_CARDS = [
  { id: "MBR-A", alias: "A. A.", cpfSuffix: "aaa", status: "PENDING_CONSENT", daysInStatus: 1, cos: "standard" },
  { id: "MBR-B", alias: "B. B.", cpfSuffix: "bbb", status: "ACTIVE", daysInStatus: 1, cos: "standard" },
  { id: "MBR-C", alias: "C. C.", cpfSuffix: "ccc", status: "SUSPENDED", daysInStatus: 1, cos: "standard", blocked: true, blockReason: "x" },
  { id: "MBR-D", alias: "D. D.", cpfSuffix: "ddd", status: "CONSENT_REVOKED", daysInStatus: 1, cos: "fixed-date" },
  { id: "MBR-E", alias: "E. E.", cpfSuffix: "eee", status: "ANONYMIZED", daysInStatus: 1, cos: "standard" },
];

const COLUMNS = [
  { key: "PENDING_CONSENT", title: "Aguardando", wipLimit: 5 },
  { key: "ACTIVE", title: "Ativo", wipLimit: null },
  { key: "SUSPENDED", title: "Suspenso", wipLimit: null },
  { key: "CONSENT_REVOKED", title: "Revogado", wipLimit: null },
  { key: "ANONYMIZED", title: "Anonimizado", wipLimit: null },
];

function payload(viewerRole: string | null) {
  return {
    columns: COLUMNS,
    cards: BASE_CARDS,
    counts: { PENDING_CONSENT: 1, ACTIVE: 1, SUSPENDED: 1, CONSENT_REVOKED: 1, ANONYMIZED: 1 },
    viewerRole,
  };
}

async function mountWithRole(html: string, viewerRole: string | null): Promise<Document> {
  // Strip the inline preview __DATA__ so the only data is what we post.
  const stripped = html.replace(/window\.__DATA__\s*=\s*\{[\s\S]*?\};/, "window.__DATA__=undefined;");
  const dom = new JSDOM(stripped, {
    runScripts: "dangerously",
    pretendToBeVisual: true,
    url: "http://localhost/",
  });
  const { window } = dom;
  // The bridge resolves data from a posted tool-result envelope.
  window.postMessage(
    {
      jsonrpc: "2.0",
      method: "ui/notifications/tool-result",
      params: { content: [{ type: "text", text: JSON.stringify(payload(viewerRole)) }] },
    },
    "*",
  );
  // Allow the message microtask + fireData to flush.
  await new Promise((r) => setTimeout(r, 30));
  return window.document;
}

function toolsForStatus(doc: Document, status: string): string[] {
  const card = doc.querySelector(`.aui-cardlet[data-id]`);
  // collect across all cards by status via the data-member on buttons
  const memberByStatus: Record<string, string> = {
    PENDING_CONSENT: "MBR-A",
    ACTIVE: "MBR-B",
    SUSPENDED: "MBR-C",
    CONSENT_REVOKED: "MBR-D",
    ANONYMIZED: "MBR-E",
  };
  void card;
  const member = memberByStatus[status];
  return Array.from(doc.querySelectorAll(`button.aui-action[data-member="${member}"]`)).map(
    (b) => b.getAttribute("data-tool")!,
  );
}

describe("member-lifecycle-board / role-gated lifecycle actions", () => {
  let html: string;

  beforeAll(() => {
    if (!existsSync(BUNDLE)) {
      execSync("node scripts/build.mjs", { cwd: PKG_ROOT, stdio: "pipe", env: { ...process.env, NODE_ENV: "production" } });
    }
    html = readFileSync(BUNDLE, "utf8");
  });

  it("DIRETORIA sees every transition for each non-terminal status", async () => {
    const doc = await mountWithRole(html, "DIRETORIA");
    expect(toolsForStatus(doc, "PENDING_CONSENT").sort()).toEqual(["grant_consent"]);
    expect(toolsForStatus(doc, "ACTIVE").sort()).toEqual(["anonymize_member", "revoke_consent", "suspend_member"]);
    expect(toolsForStatus(doc, "SUSPENDED").sort()).toEqual(["anonymize_member", "reinstate_member"]);
    expect(toolsForStatus(doc, "CONSENT_REVOKED").sort()).toEqual(["anonymize_member"]);
    // terminal status has no actions
    expect(toolsForStatus(doc, "ANONYMIZED")).toEqual([]);
  });

  it("RESPONSAVEL_TECNICO cannot anonymize (DPO/DIRETORIA only)", async () => {
    const doc = await mountWithRole(html, "RESPONSAVEL_TECNICO");
    expect(toolsForStatus(doc, "ACTIVE").sort()).toEqual(["revoke_consent", "suspend_member"]);
    expect(toolsForStatus(doc, "SUSPENDED")).toEqual(["reinstate_member"]);
    expect(toolsForStatus(doc, "CONSENT_REVOKED")).toEqual([]);
  });

  it("DPO sees revoke + anonymize but not suspend/reinstate", async () => {
    const doc = await mountWithRole(html, "DPO");
    expect(toolsForStatus(doc, "ACTIVE").sort()).toEqual(["anonymize_member", "revoke_consent"]);
    expect(toolsForStatus(doc, "SUSPENDED")).toEqual(["anonymize_member"]);
    expect(toolsForStatus(doc, "PENDING_CONSENT")).toEqual([]);
  });

  it("AUDITOR (read-only) and missing role see NO action buttons (fail-closed)", async () => {
    const auditor = await mountWithRole(html, "AUDITOR");
    expect(auditor.querySelectorAll("button.aui-action").length).toBe(0);
    const none = await mountWithRole(html, null);
    expect(none.querySelectorAll("button.aui-action").length).toBe(0);
  });
});
