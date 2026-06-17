/**
 * LOCAL widget e2e — member-lifecycle-board.
 *
 * Hermetic (no prod MCP): loads packages/ui-apps/dist/member-lifecycle-board.html,
 * posts the host's SLASH-keyed JSON-RPC tool-result envelope carrying a
 * get_members_by_status payload, and asserts:
 *   1. the Kanban columns + LGPD-safe member cardlets render from the payload;
 *   2. role-gated action buttons appear for a privileged viewerRole;
 *   3. ZERO console errors / page errors during mount + render;
 *   4. a11y basics: lang + titled document.
 *
 * The deep role-gating matrix is covered unit-side in
 * packages/ui-apps/src/__tests__/lifecycle-board-actions.spec.ts (jsdom). This
 * e2e proves the same shipped bundle mounts + renders cleanly in a real browser
 * via the live host handshake.
 *
 * Build the bundle first: pnpm --filter @canna/ui-apps build
 */
import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RESOURCE_URI = "ui://member-lifecycle-board/app.html";
const BUNDLE = fileURLToPath(
  new URL(
    "../packages/ui-apps/dist/member-lifecycle-board.html",
    import.meta.url,
  ),
);

const COLUMNS = [
  { key: "PENDING_CONSENT", title: "Aguardando", wipLimit: 5 },
  { key: "ACTIVE", title: "Ativo", wipLimit: null },
  { key: "SUSPENDED", title: "Suspenso", wipLimit: null },
  { key: "CONSENT_REVOKED", title: "Revogado", wipLimit: null },
  { key: "ANONYMIZED", title: "Anonimizado", wipLimit: null },
];
const CARDS = [
  { id: "MBR-A", alias: "A. A.", cpfSuffix: "aaa", status: "PENDING_CONSENT", daysInStatus: 1, cos: "standard" },
  { id: "MBR-B", alias: "B. B.", cpfSuffix: "bbb", status: "ACTIVE", daysInStatus: 1, cos: "standard" },
  { id: "MBR-C", alias: "C. C.", cpfSuffix: "ccc", status: "SUSPENDED", daysInStatus: 1, cos: "standard", blocked: true, blockReason: "x" },
];
const payload = (viewerRole: string | null) => ({
  columns: COLUMNS,
  cards: CARDS,
  counts: { PENDING_CONSENT: 1, ACTIVE: 1, SUSPENDED: 1, CONSENT_REVOKED: 0, ANONYMIZED: 0 },
  viewerRole,
});

test.beforeAll(() => {
  expect(
    existsSync(BUNDLE),
    `missing ${BUNDLE} — run: pnpm --filter @canna/ui-apps build`,
  ).toBe(true);
});

async function mount(page: import("@playwright/test").Page, viewerRole: string | null) {
  // Neutralise any inline preview data so the only source is the posted envelope.
  const html = readFileSync(BUNDLE, "utf8").replace(
    /window\.__DATA__\s*=\s*\{[\s\S]*?\};/,
    "window.__DATA__=undefined;",
  );
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(
    ({ uri, text }) => {
      window.postMessage(
        {
          jsonrpc: "2.0",
          method: "ui/notifications/tool-result",
          _meta: { "ui/resourceUri": uri },
          params: { content: [{ type: "text", text }] },
        },
        "*",
      );
    },
    { uri: RESOURCE_URI, text: JSON.stringify(payload(viewerRole)) },
  );
}

test("member-lifecycle-board renders columns + LGPD-safe cardlets via SLASH handshake, zero console errors", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(e.message));

  await mount(page, "DIRETORIA");

  await expect(page.locator(".aui-col")).toHaveCount(5);
  await expect(page.locator(".aui-cardlet")).toHaveCount(3);
  // LGPD-safe: cards show initials/alias, not full names.
  await expect(page.locator(".aui-cardlet").first()).toContainText("A. A.");
  // Privileged viewer sees role-gated action buttons.
  await expect(page.locator("button.aui-action").first()).toBeVisible();

  expect(
    consoleErrors,
    `console errors: ${consoleErrors.join(" | ")}`,
  ).toEqual([]);
});

test("member-lifecycle-board: a11y basics (lang + titled document)", async ({
  page,
}) => {
  await mount(page, "DIRETORIA");
  await expect(page.locator("html")).toHaveAttribute("lang", /.+/);
  await expect(page).toHaveTitle(/.+/);
});
