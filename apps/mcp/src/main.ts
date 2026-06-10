/**
 * canna-mcp entrypoint — Streamable HTTP MCP transport.
 *
 * v0.2.1.1 thin executable wrapping `createCannaMcpServer()` factory. Exposes
 * MCP over HTTP/SSE on `PORT` (default 3001). Open WebUI v0.9.6+ registers
 * this via `POST /api/v1/configs/tool_servers` (seed script in
 * `ops/openwebui/scripts/seed-tool-servers.ts`).
 *
 * Stateless mode (no session id) — every request creates a fresh transport
 * binding. Long-running container; survives SIGINT/SIGTERM gracefully.
 *
 * Auth: caller MUST send headers `x-canna-user`, `x-canna-role`,
 * `x-canna-association` (v0.2.1 stub). Real OAuth 2.1 wiring lands in
 * v0.2.1.x once Authentik is provisioned.
 *
 * Health: GET /health → 200.
 */
import http from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createPostgresEventStore } from "@canna/event-store";
import { createCannaMcpServer } from "./server.js";
import type { Role, ToolContext } from "./types.js";

const env = (k: string): string | undefined => process.env[k];

const isRole = (s: string): s is Role =>
  s === "DISPENSADOR" ||
  s === "RESPONSAVEL_TECNICO" ||
  s === "DIRETORIA" ||
  s === "DPO" ||
  s === "AUDITOR" ||
  s === "FEDERATION" ||
  s === "GUEST";

const main = async (): Promise<void> => {
  const databaseUrl = env("DATABASE_URL");
  if (databaseUrl === undefined || databaseUrl.length === 0) {
    process.stderr.write("FATAL: DATABASE_URL not set\n");
    process.exit(1);
  }

  const port = Number(env("PORT") ?? "3001");
  const host = env("HOST") ?? "0.0.0.0";

  const store = createPostgresEventStore({ connectionString: databaseUrl });

  const { server } = createCannaMcpServer({
    store,
    async resolveContext(headers): Promise<ToolContext> {
      const get = (k: string): string | undefined => {
        const v = headers[k] ?? headers[k.toLowerCase()];
        return typeof v === "string" && v.length > 0 ? v : undefined;
      };
      const userId = get("x-canna-user") ?? "anonymous";
      const roleRaw = get("x-canna-role") ?? "GUEST";
      const role: Role = isRole(roleRaw) ? roleRaw : "GUEST";
      const associationId = get("x-canna-association") ?? "unknown";
      const chatId = get("x-canna-chat");
      const ctx: ToolContext = {
        store,
        userId,
        role,
        associationId,
        now: new Date(),
        ...(chatId !== undefined ? { chatId } : {}),
      };
      return ctx;
    },
  });

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });
  await server.connect(transport);

  const httpServer = http.createServer((req, res) => {
    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, name: "canna-mcp", version: "0.2.1" }));
      return;
    }
    void transport.handleRequest(req, res).catch((e: unknown) => {
      process.stderr.write(`mcp transport error: ${String(e)}\n`);
      if (!res.headersSent) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "INTERNAL" }));
      }
    });
  });

  const shutdown = async (signal: string): Promise<void> => {
    process.stderr.write(`canna-mcp shutdown signal=${signal}\n`);
    httpServer.close();
    try {
      await server.close();
    } catch {
      // ignore
    }
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  httpServer.listen(port, host, () => {
    process.stderr.write(
      `canna-mcp listening on http://${host}:${String(port)} (StreamableHTTP)\n`,
    );
  });
};

main().catch((err) => {
  process.stderr.write(`canna-mcp boot failed: ${String(err)}\n`);
  if (err instanceof Error && err.stack !== undefined) {
    process.stderr.write(`${err.stack}\n`);
  }
  process.exit(1);
});
