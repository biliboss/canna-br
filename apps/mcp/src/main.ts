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
import {
  createPostgresStoreFromConnectionString,
  type ReadModelQuery,
} from "@canna/read-models";
import { createCannaMcpServer } from "./server.js";
import { makeResolveContext } from "./auth.js";

const env = (k: string): string | undefined => process.env[k];

const main = async (): Promise<void> => {
  const databaseUrl = env("DATABASE_URL");
  if (databaseUrl === undefined || databaseUrl.length === 0) {
    process.stderr.write("FATAL: DATABASE_URL not set\n");
    process.exit(1);
  }

  const port = Number(env("PORT") ?? "3001");
  const host = env("HOST") ?? "0.0.0.0";

  const store = createPostgresEventStore({ connectionString: databaseUrl });

  // Read-model query surface: in production the same Postgres instance backs
  // the Drizzle projections, so the query tools read from it. Built once and
  // shared across requests (it owns a pg Pool). Fails closed — if the adapter
  // cannot be built we leave it undefined and tools return
  // READ_MODEL_STORE_UNAVAILABLE rather than crashing the host.
  let readModelStore: ReadModelQuery | undefined;
  try {
    readModelStore = await createPostgresStoreFromConnectionString(databaseUrl);
  } catch (e: unknown) {
    process.stderr.write(`read-model store unavailable: ${String(e)}\n`);
  }

  // Auth gate: when JWT_SECRET is set (production), every request MUST present
  // a valid `Authorization: Bearer <jwt>` and the role/userId/associationId are
  // derived from the VERIFIED claims — a raw `x-canna-role` header is ignored
  // and can NOT escalate. When JWT_SECRET is unset (dev/local), the legacy
  // header stub is used so local dev and tests work without an issuer.
  const jwtSecret = env("JWT_SECRET");
  if (jwtSecret === undefined || jwtSecret.length === 0) {
    process.stderr.write(
      "WARN: JWT_SECRET unset — running in DEV header-auth mode (insecure; forged x-canna-role is trusted). Set JWT_SECRET in production.\n",
    );
  }
  const resolveContext = makeResolveContext({
    store,
    ...(readModelStore !== undefined ? { readModelStore } : {}),
    ...(jwtSecret !== undefined ? { jwtSecret } : {}),
  });

  // Stateless StreamableHTTP: the SDK transport binds to a single server
  // lifecycle, so a shared transport reused across requests throws (the live
  // bug that 500'd every real MCP client while the in-memory unit tests — which
  // use a linked pair, not this HTTP host — stayed green). Create a fresh
  // server + transport per request, tear them down on response close.
  const httpServer = http.createServer((req, res) => {
    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, name: "canna-mcp", version: "0.2.1" }));
      return;
    }
    void (async (): Promise<void> => {
      const { server } = createCannaMcpServer({ store, resolveContext });
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless
      });
      res.on("close", () => {
        void transport.close();
        void server.close();
      });
      try {
        await server.connect(transport);
        await transport.handleRequest(req, res);
      } catch (e: unknown) {
        process.stderr.write(`mcp transport error: ${String(e)}\n`);
        if (!res.headersSent) {
          res.writeHead(500, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: "INTERNAL" }));
        }
      }
    })();
  });

  const shutdown = (signal: string): void => {
    process.stderr.write(`canna-mcp shutdown signal=${signal}\n`);
    // Per-request servers/transports are torn down on response close; just stop
    // accepting new connections.
    httpServer.close();
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
