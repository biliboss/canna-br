/**
 * LOCAL widget e2e — dispensation-form (Risk Level 3).
 *
 * Hermetic (no prod MCP): loads packages/ui-apps/dist/dispensation-form.html,
 * posts the host's SLASH-keyed JSON-RPC tool-result envelope (the draft preview),
 * and asserts:
 *   1. the form renders its fields + Preview/Submit controls;
 *   2. on tool-result the #preview reveals the draft and #submitBtn unlocks
 *      (the host→widget handshake the assistant-ui bridge drives at runtime);
 *   3. ZERO console errors / page errors;
 *   4. a11y basics: every input has an associated <label for>.
 *
 * Build the bundle first: pnpm --filter @canna/ui-apps build
 */
import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const RESOURCE_URI = "ui://dispensation-form/app.html";
const BUNDLE = fileURLToPath(
  new URL("../packages/ui-apps/dist/dispensation-form.html", import.meta.url),
);

const DRAFT = {
  memberId: "01HM0MEMBER000000000000001",
  lotId: "01HM0LOT0000000000000000001",
  quantityG: 5,
  remainingAfterG: 18,
  note: "Preview only — requires RT approval",
};

test.beforeAll(() => {
  expect(
    existsSync(BUNDLE),
    `missing ${BUNDLE} — run: pnpm --filter @canna/ui-apps build`,
  ).toBe(true);
});

test("dispensation-form renders + unlocks submit on SLASH-handshake tool-result, zero console errors", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(e.message));

  await page.setContent(readFileSync(BUNDLE, "utf8"), { waitUntil: "load" });
  await page.waitForSelector("#form");

  // Initial state: preview hidden, submit disabled (fail-closed).
  await expect(page.locator("#preview")).toBeHidden();
  await expect(page.locator("#submitBtn")).toBeDisabled();

  // Host flushes the draft_dispensation result through the bridge.
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
    { uri: RESOURCE_URI, text: JSON.stringify(DRAFT) },
  );

  await expect(page.locator("#preview")).toBeVisible();
  await expect(page.locator("#preview")).toContainText("remainingAfterG");
  await expect(page.locator("#submitBtn")).toBeEnabled();

  expect(
    consoleErrors,
    `console errors: ${consoleErrors.join(" | ")}`,
  ).toEqual([]);
});

test("dispensation-form: a11y — every input has an associated <label for>", async ({
  page,
}) => {
  await page.setContent(readFileSync(BUNDLE, "utf8"), { waitUntil: "load" });
  await expect(page.locator("html")).toHaveAttribute("lang", /.+/);

  const unlabeled = await page.evaluate(() => {
    const orphans: string[] = [];
    document.querySelectorAll("input").forEach((el) => {
      const id = el.getAttribute("id");
      const hasLabel =
        !!id && !!document.querySelector(`label[for="${id}"]`);
      const hasAria =
        el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby");
      if (!hasLabel && !hasAria) orphans.push(id ?? el.outerHTML.slice(0, 40));
    });
    return orphans;
  });
  expect(unlabeled, `inputs without a label: ${unlabeled.join(", ")}`).toEqual(
    [],
  );
});
