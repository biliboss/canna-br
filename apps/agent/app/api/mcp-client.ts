import { createHmac } from "node:crypto";
import {
  experimental_createMCPClient as createMCPClient,
  type MCPClient,
} from "@ai-sdk/mcp";
import type { ToolSet } from "ai";

// NOTE: the MCP client is NOT cached. In production the auth header carries a
// short-lived (5-min) signed JWT; a cached singleton would freeze ONE token and
// keep sending it after expiry → every later tool-call fails AUTH_FAILED (the
// regression the wave.11 chat-toolcall e2e caught). Mint a fresh client (and
// thus a fresh token via mcpHeaders()) per request — correctness over a small
// perf win on a stateless transport.

/**
 * Mint a short-lived HS256 JWT for the MCP host. Mirrors `signHs256` in
 * @canna/mcp (apps/mcp/src/auth.ts) — kept inline so this Next app does not
 * pull the whole MCP/pg package into its bundle. Server-side only: JWT_SECRET
 * lives in the route runtime, never shipped to the browser.
 */
function signMcpToken(secret: string): string {
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  const iat = Math.floor(Date.now() / 1000);
  const header = b64({ alg: "HS256", typ: "JWT" });
  const payload = b64({
    sub: process.env.CANNA_USER ?? "admin",
    role: process.env.CANNA_ROLE ?? "DIRETORIA",
    associationId: process.env.CANNA_ASSOCIATION ?? "unknown",
    iat,
    exp: iat + 300,
  });
  const sig = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${sig}`;
}

function mcpHeaders(): Record<string, string> {
  const secret = process.env.JWT_SECRET;
  if (secret !== undefined && secret.length > 0) {
    // Production: the MCP server verifies this token and derives role/user/
    // association from the SIGNED claims. Raw x-canna-* headers are ignored.
    return { authorization: `Bearer ${signMcpToken(secret)}` };
  }
  // Dev: no issuer configured — legacy header stub (MCP server runs in dev
  // header-auth mode when its own JWT_SECRET is also unset).
  return {
    "x-canna-user": process.env.CANNA_USER ?? "admin",
    "x-canna-role": process.env.CANNA_ROLE ?? "DIRETORIA",
    "x-canna-association": process.env.CANNA_ASSOCIATION ?? "",
  };
}

/**
 * Singleton MCP client pointing at apps/mcp (canna-br's StreamableHTTP server).
 *
 * apps/mcp listens on port 3001 by default (see apps/mcp/src/main.ts).
 * The transport is stateless StreamableHTTP — every request is independent.
 * Auth headers (x-canna-user, x-canna-role, x-canna-association) are passed
 * through by the route layer when needed.
 *
 * In dev: run `pnpm --filter @canna/mcp start` with DATABASE_URL set.
 * MCP_SERVER_URL default: http://localhost:3001
 * (Note: apps/mcp does not mount at /mcp — the root path handles all requests.)
 */
export function getMcpClient(): Promise<MCPClient> {
  // Fresh client per call → mcpHeaders() mints a fresh, unexpired token.
  return createMCPClient({
    transport: {
      type: "http",
      url: process.env.MCP_SERVER_URL ?? "http://localhost:3001",
      // apps/mcp derives role/user/association from a VERIFIED JWT when
      // JWT_SECRET is set (production); a forged raw x-canna-role can no longer
      // escalate. In dev (no JWT_SECRET) it falls back to the header stub.
      headers: mcpHeaders(),
    },
  });
}

export async function getMcpTools(): Promise<ToolSet> {
  // Not cached: the client carrying the (expiring) token must be fresh too.
  const client = await getMcpClient();
  return (await client.tools()) as ToolSet;
}

// --- OKF domain knowledge ----------------------------------------------------
// The MCP server (apps/mcp) serves the curated OKF bundle as resources under
// `okf://domain/<slug>` (RDC 1.014 segregation, member lifecycle, monthly quota,
// roles glossary). We inject this KNOWLEDGE next to the TOOLS so the agent can
// answer domain questions grounded in the bundle — not from the model's memory.
//
// Only these key concepts are injected (kept lean so the context window is not
// blown). The index/log meta-docs are skipped.
const OKF_SCHEME = "okf://domain/";
const OKF_KEY_SLUGS = [
  "rdc-1014-segregation",
  "member-lifecycle",
  "monthly-quota",
  "roles-glossary",
] as const;

/**
 * Fetch the OKF domain bundle from the MCP server and render it as a single
 * curated context block for the system prompt. Mints a fresh client (fresh
 * token — same no-singleton rule as the tools path). Degrades gracefully: if
 * the MCP server is down or a resource is missing, returns whatever was read
 * (possibly ""), never throws — a dead MCP must not 500 the chat.
 */
export async function getOkfContext(): Promise<string> {
  let client: MCPClient | undefined;
  try {
    client = await getMcpClient();
    const { resources } = await client.listResources();
    const okfUris = new Set(
      resources
        .map((r) => r.uri)
        .filter((uri) =>
          OKF_KEY_SLUGS.some((slug) => uri === `${OKF_SCHEME}${slug}`),
        ),
    );

    const blocks: string[] = [];
    for (const uri of okfUris) {
      try {
        const { contents } = await client.readResource({ uri });
        for (const c of contents) {
          const text = (c as { text?: string }).text;
          if (typeof text === "string" && text.length > 0) {
            blocks.push(text.trim());
          }
        }
      } catch {
        // skip a single unreadable resource; keep the rest
      }
    }

    if (blocks.length === 0) return "";
    return [
      "## Conhecimento de domínio (OKF) — base autoritativa",
      "Use o conhecimento abaixo como FONTE DE VERDADE para perguntas de regra/compliance/processo.",
      "Ele vem do bundle OKF curado da associação (RDC, ciclo de vida, cota, papéis).",
      "",
      blocks.join("\n\n---\n\n"),
    ].join("\n");
  } catch {
    // MCP unreachable → no grounding this turn, but the chat still works.
    return "";
  } finally {
    try {
      await client?.close();
    } catch {
      /* best-effort */
    }
  }
}
