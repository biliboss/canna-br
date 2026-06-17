/**
 * LOCAL widget e2e — traceability-timeline.
 *
 * Hermetic (no prod MCP): loads the shipped single-file bundle
 * packages/ui-apps/dist/traceability-timeline.html, posts the EXACT host
 * envelope assistant-ui emits — a JSON-RPC `method: "ui/notifications/tool-result"`
 * carrying `_meta["ui/resourceUri"]` in SLASH form (the live-only routing key;
 * dot-form renders blank with zero console errors) — and asserts:
 *   1. the widget renders the real timeline nodes from the posted payload;
 *   2. ZERO console errors / page errors during mount + render;
 *   3. basic a11y: html lang + titled document.
 *
 * Build the bundle first: pnpm --filter @canna/ui-apps build
 */
import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RESOURCE_URI = "ui://traceability-timeline/app.html";
const BUNDLE = fileURLToPath(
  new URL(
    "../packages/ui-apps/dist/traceability-timeline.html",
    import.meta.url,
  ),
);

const TIMELINE = {
  timeline: [
    { phase: "Membro verificado", date: "2026-01-02" },
    { phase: "Prescrição emitida", date: "2026-01-03" },
    { phase: "Lote selecionado", date: "2026-01-04" },
    { phase: "Dispensação registrada", date: "2026-01-05" },
  ],
};

test.beforeAll(() => {
  expect(
    existsSync(BUNDLE),
    `missing ${BUNDLE} — run: pnpm --filter @canna/ui-apps build`,
  ).toBe(true);
});

test("traceability-timeline renders chain via SLASH-handshake envelope, zero console errors", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(e.message));

  await page.setContent(readFileSync(BUNDLE, "utf8"), { waitUntil: "load" });
  await page.waitForSelector("#root");

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
    { uri: RESOURCE_URI, text: JSON.stringify(TIMELINE) },
  );

  await expect(page.locator(".timeline .node").first()).toHaveText(
    "Membro verificado",
  );
  await expect(page.locator(".timeline .node")).toHaveCount(4);
  await expect(page.locator(".timeline .arrow")).toHaveCount(3);

  expect(
    consoleErrors,
    `console errors: ${consoleErrors.join(" | ")}`,
  ).toEqual([]);
});

test("traceability-timeline: a11y basics (lang + titled document)", async ({
  page,
}) => {
  await page.setContent(readFileSync(BUNDLE, "utf8"), { waitUntil: "load" });
  await expect(page.locator("html")).toHaveAttribute("lang", /.+/);
  await expect(page).toHaveTitle(/.+/);
});
