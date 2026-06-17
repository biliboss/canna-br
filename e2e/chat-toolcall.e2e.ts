/**
 * Wave.11 Vistoria — CHAT→MCP tool-call e2e (cb-chat-toolcall-e2e).
 *
 * The agent at app.cannabr.org calls the MCP server-side. This exact flow was
 * SILENTLY BROKEN in prod (MCP_SERVER_URL pointed at the wrong container → text
 * chat worked, tool-calls never ran). This e2e drives /api/chat with a prompt
 * that FORCES an MCP tool and asserts the tool actually ran — so the wiring/auth
 * regression can never hide behind a 200 again.
 *
 * PROD-TARGETED (app.cannabr.org, Basic gate). Skips when creds absent so the
 * offline gate stays hermetic. Run via `pnpm test:e2e:prod`.
 */
import { test, expect } from "@playwright/test";

const APP = process.env.CANNA_APP_URL ?? "https://app.cannabr.org";
const BASIC_USER = process.env.CANNA_APP_USER ?? "canna";
const BASIC_PASS = process.env.CANNA_APP_PASS ?? "";

test.skip(!BASIC_PASS, "CANNA_APP_PASS unset — prod chat e2e skipped");

const AUTH = "Basic " + Buffer.from(`${BASIC_USER}:${BASIC_PASS}`).toString("base64");

// Forceful, tool-directing prompt. The LLM still decides whether to call a tool,
// so this is non-deterministic — we retry and require that AT LEAST ONE attempt
// invokes the MCP tool AND it runs without error. A broken wiring/auth (the
// MCP_SERVER_URL-stale regression) makes EVERY attempt fail → the test catches it.
const PROMPT =
  "Use a ferramenta get_members_by_status para listar os membros com status ACTIVE. " +
  "Você DEVE chamar a ferramenta MCP — não responda de memória.";

async function attempt(): Promise<{ status: number; body: string }> {
  const res = await fetch(`${APP}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: AUTH },
    body: JSON.stringify({
      messages: [{ role: "user", parts: [{ type: "text", text: PROMPT }] }],
    }),
  });
  return { status: res.status, body: await res.text() };
}

test("chat→MCP tool-call works end-to-end (wiring + auth)", async () => {
  let toolRan = false;
  let lastBody = "";
  for (let i = 0; i < 4 && !toolRan; i++) {
    const { status, body } = await attempt();
    expect(status, "chat endpoint responds 200").toBe(200);
    lastBody = body;
    const invoked = /get_members_by_status|"type":"tool-/.test(body);
    const finishedViaTools = body.includes('"finishReason":"tool-calls"');
    const erroredTool = body.includes('"isError":true') || /"errorText"/.test(body);
    if (invoked && finishedViaTools && !erroredTool) toolRan = true;
  }
  expect(
    toolRan,
    `no successful MCP tool-call across 4 attempts — wiring/auth regression?\nlast stream:\n${lastBody.slice(0, 800)}`,
  ).toBe(true);
});
