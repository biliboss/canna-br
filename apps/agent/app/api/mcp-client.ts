import {
  experimental_createMCPClient as createMCPClient,
  type MCPClient,
} from "@ai-sdk/mcp";
import type { ToolSet } from "ai";

let mcpClientPromise: ReturnType<typeof createMCPClient> | null = null;
let cachedTools: ToolSet | null = null;

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
      // apps/mcp gates every tool by ctx.role (x-canna-role); absent headers
      // default to GUEST and ALL tools 403. Until Zitadel OIDC lands (v0.1.x),
      // pass the role/user/association as a dev stopgap from env so the chat
      // can actually call tools. Real OAuth 2.1 token → claims replaces this.
      headers: {
        "x-canna-user": process.env.CANNA_USER ?? "admin",
        "x-canna-role": process.env.CANNA_ROLE ?? "DIRETORIA",
        "x-canna-association": process.env.CANNA_ASSOCIATION ?? "",
      },
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
