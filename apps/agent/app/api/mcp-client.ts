import { createHmac } from "node:crypto";
import {
  experimental_createMCPClient as createMCPClient,
  type MCPClient,
} from "@ai-sdk/mcp";
import type { ToolSet } from "ai";

let mcpClientPromise: ReturnType<typeof createMCPClient> | null = null;
let cachedTools: ToolSet | null = null;

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
  mcpClientPromise ??= createMCPClient({
    transport: {
      type: "http",
      url: process.env.MCP_SERVER_URL ?? "http://localhost:3001",
      // apps/mcp derives role/user/association from a VERIFIED JWT when
      // JWT_SECRET is set (production); a forged raw x-canna-role can no longer
      // escalate. In dev (no JWT_SECRET) it falls back to the header stub.
      headers: mcpHeaders(),
    },
  });
  return mcpClientPromise;
}

export async function getMcpTools(): Promise<ToolSet> {
  if (cachedTools) return cachedTools;
  const client = await getMcpClient();
  cachedTools = (await client.tools()) as ToolSet;
  return cachedTools;
}
