/**
 * PRODUCTION e2e harness — member-quota-card.
 *
 * Proves, against the LIVE MCP server (CANNA_MCP_URL, default
 * https://mcp.canna.fonsecagabriel.com.br), that:
 *   1. the prod tool get_member_quota returns REAL remainingG for the seed member;
 *   2. tools/list advertises the widget with the SLASH-form _meta["ui/resourceUri"]
 *      (the ext-apps routing key — dot-form is the live-only bug → this is the guard);
 *   3. the prod-served HTML bundle, fed the prod tool result via the host's
 *      postMessage envelope, renders the real numbers inline with ZERO console errors.
 *
 * This does NOT prove inline-render INSIDE the prod chat surface — no prod surface
 * renders ext-apps inline today (OWUI = tool-server only; apps/agent undeployed).
 * It proves bundle + bridge + real-data end-to-end against prod. See
 * apps/mcp/MCP_APPS_VERIFIABILITY.md for the surface gap.
 */
import { test, expect } from "@playwright/test";
import {
  probeProdMemberQuota,
  QUOTA_RESOURCE_URI,
  expected,
  MCP_URL,
  type ProdQuotaProbe,
} from "./lib/mcp-prod-client.js";

let probe: ProdQuotaProbe;

test.beforeAll(async () => {
  test.info().annotations.push({ type: "prod-mcp-url", description: MCP_URL });
  probe = await probeProdMemberQuota();
});

test("prod get_member_quota returns real remainingG for seed member", () => {
  expect(typeof probe.payload["remainingG"]).toBe("number");
  expect(probe.payload["remainingG"]).toBe(expected.remainingG);
  expect(probe.payload["consumedG"]).toBe(expected.consumedG);
  expect(probe.payload["memberId"]).toBe(expected.memberId);
});

test("GUARD: tools/list advertises slash-form _meta['ui/resourceUri'] (anti-false-green)", () => {
  // The live-only bug is dot-form _meta.ui.resourceUri → iframe never renders.
  // Reintroducing it (server.ts toToolListItem) + running this harness against
  // a local build (CANNA_MCP_URL=http://localhost:3001) must turn this RED.
  expect(probe.toolMeta).toBeDefined();
  expect(probe.toolMeta?.["ui/resourceUri"]).toBe(QUOTA_RESOURCE_URI);
});

test("member-quota-card renders prod data inline with zero console errors", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(err.message));

  await page.setContent(probe.bundleHtml, { waitUntil: "load" });
  await page.waitForSelector("#consumed");

  // Post the exact envelope the assistant-ui host posts (JSON-RPC `method`),
  // carrying the REAL prod tool result text.
  await page.evaluate((text) => {
    window.postMessage(
      {
        jsonrpc: "2.0",
        method: "ui/notifications/tool-result",
        _meta: { "ui/resourceUri": "ui://member-quota-card/app.html" },
        params: { content: [{ type: "text", text }] },
      },
      "*",
    );
  }, probe.toolResultText);

  await expect(page.locator("#consumed")).toHaveText(
    new RegExp(`${expected.consumedG}\\s*g`),
  );
  await expect(page.locator("#cap")).toHaveText(/of\s+\d+\s*g/);
  await expect(page.locator("#title")).toContainText(expected.memberId);

  expect(consoleErrors, `console errors: ${consoleErrors.join(" | ")}`).toEqual(
    [],
  );
});
