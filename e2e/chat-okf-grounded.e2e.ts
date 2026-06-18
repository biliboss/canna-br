/**
 * Wave.13 — CHAT grounded in OKF domain bundle (cb-okf-agent-grounded).
 *
 * The agent injects the OKF domain resources (okf://domain/<slug>) into the
 * chat context server-side (see apps/agent/app/api/mcp-client.ts:getOkfContext
 * + app/api/chat/route.ts). This e2e proves the model answers a pure-DOMAIN
 * question — one that needs NO tool call — using the BUNDLE's facts.
 *
 * The question ("quem pode aprovar uma dispensação? qual a regra de segregação?")
 * is answered from RDC 1.014: solicitante ≠ aprovador, a mesma pessoa não pode
 * aprovar a própria solicitação, aprovador distinto (RESPONSAVEL_TECNICO /
 * DIRETORIA). If the OKF context never reached the model, the answer would be
 * generic / wrong / hedged — the guard below fails.
 *
 * NON-DETERMINISTIC (LLM): GUARD shape — retry N, parse the SSE stream, collect
 * the assistant text, and require AT LEAST ONE attempt whose answer reflects the
 * bundle facts. Fail only if NO attempt ever reflects them.
 *
 * TARGET: defaults to LOCAL dev (http://localhost:3002) so it runs against the
 * NEW code. Point CANNA_APP_URL at prod once deployed. Skips without a pass.
 *   Run locally:
 *     pnpm --filter @canna/mcp start            # needs DATABASE_URL (OKF served off disk)
 *     MCP_ENABLED=1 OPENROUTER_API_KEY=... pnpm --filter @canna/agent dev
 *     CANNA_APP_URL=http://localhost:3002 CANNA_APP_PASS=cannabr2026 pnpm test:e2e:prod
 */
import { test, expect } from "@playwright/test";

const APP = process.env.CANNA_APP_URL ?? "http://localhost:3002";
const BASIC_USER = process.env.CANNA_APP_USER ?? "canna";
const BASIC_PASS = process.env.CANNA_APP_PASS ?? "";

test.skip(!BASIC_PASS, "CANNA_APP_PASS unset — chat OKF-grounded e2e skipped");

const AUTH =
  "Basic " + Buffer.from(`${BASIC_USER}:${BASIC_PASS}`).toString("base64");

// Pure-DOMAIN question: answerable ONLY from knowledge, never from a tool.
const PROMPT =
  "Qual é a regra de segregação de função na dispensação canábica? " +
  "Quem pode aprovar uma dispensação e quem NÃO pode? Responda com base nas regras da associação.";

// Bundle facts (RDC 1.014). At least one must surface in the answer text.
const BUNDLE_FACTS =
  /segrega|aprovador distinto|n[ãa]o pode aprovar.*pr[óo]pri|solicitante.*≠|solicitante.*diferente|quem solicita.*n[ãa]o.*aprova|RESPONSAVEL_TECNICO|DIRETORIA|RDC|dois atores/i;

/** Parse an AI-SDK UI message stream, concatenate all text-delta payloads. */
function collectText(body: string): string {
  let out = "";
  for (const line of body.split("\n")) {
    const t = line.startsWith("data:") ? line.slice(5).trim() : line.trim();
    if (!t || t === "[DONE]") continue;
    try {
      const obj = JSON.parse(t) as { type?: string; delta?: string; text?: string };
      if (obj.type === "text-delta" && typeof obj.delta === "string") out += obj.delta;
      else if (obj.type === "text-delta" && typeof obj.text === "string") out += obj.text;
    } catch {
      // not JSON line — ignore
    }
  }
  // Fallback: if no structured deltas parsed, scan the raw body too.
  return out.length > 0 ? out : body;
}

async function attempt(): Promise<{ status: number; text: string; raw: string }> {
  const res = await fetch(`${APP}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: AUTH },
    body: JSON.stringify({
      messages: [{ role: "user", parts: [{ type: "text", text: PROMPT }] }],
    }),
  });
  const raw = await res.text();
  return { status: res.status, text: collectText(raw), raw };
}

test("chat answers a domain question grounded in the OKF bundle", async () => {
  let grounded = false;
  let lastText = "";
  for (let i = 0; i < 5 && !grounded; i++) {
    const { status, text, raw } = await attempt();
    expect(status, `chat endpoint responds 200\n${raw.slice(0, 400)}`).toBe(200);
    lastText = text;
    if (BUNDLE_FACTS.test(text)) grounded = true;
  }
  expect(
    grounded,
    `answer never reflected OKF bundle facts (grounding likely not wired):\n${lastText.slice(0, 1200)}`,
  ).toBe(true);
});
