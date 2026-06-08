/**
 * Tests for `seed-tool-servers.ts`.
 *
 * Uses a real Node `http.Server` as the mock OWUI — no third-party HTTP mock
 * libs. The script's exported `seed(config, fetchFn)` is invoked directly so
 * the test never touches `process.exit`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { AddressInfo } from "node:net";
import {
  configFromEnv,
  main,
  seed,
  type FetchLike,
  type SeedConfig,
} from "../seed-tool-servers.ts";

interface MockState {
  signinResponse: { status: number; body: unknown };
  toolServers: Array<{ id?: string; name?: string; url?: string; type?: string }>;
  postCount: number;
  postPayloads: Array<unknown>;
}

function makeState(): MockState {
  return {
    signinResponse: { status: 200, body: { token: "fake-jwt" } },
    toolServers: [],
    postCount: 0,
    postPayloads: [],
  };
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function startMockServer(state: MockState): Promise<{ server: Server; baseUrl: string }> {
  const server = createServer((req, res) => {
    void (async () => {
      const url = req.url ?? "";
      const method = req.method ?? "GET";

      if (method === "POST" && url === "/api/v1/auths/signin") {
        await readBody(req);
        sendJson(res, state.signinResponse.status, state.signinResponse.body);
        return;
      }

      if (method === "GET" && url === "/api/v1/configs/tool_servers") {
        sendJson(res, 200, { TOOL_SERVER_CONNECTIONS: state.toolServers });
        return;
      }

      if (method === "POST" && url === "/api/v1/configs/tool_servers") {
        const raw = await readBody(req);
        const parsed = JSON.parse(raw) as {
          TOOL_SERVER_CONNECTIONS: MockState["toolServers"];
        };
        state.postCount += 1;
        state.postPayloads.push(parsed);
        // Simulate server-side id allocation
        state.toolServers = parsed.TOOL_SERVER_CONNECTIONS.map((c, i) => ({
          ...c,
          id: c.id ?? `conn-${String(i + 1)}`,
        }));
        sendJson(res, 200, { TOOL_SERVER_CONNECTIONS: state.toolServers });
        return;
      }

      sendJson(res, 404, { error: `unhandled ${method} ${url}` });
    })().catch((err) => {
      sendJson(res, 500, { error: String(err) });
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address() as AddressInfo;
      resolve({ server, baseUrl: `http://127.0.0.1:${String(addr.port)}` });
    });
  });
}

function stopServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

const fetchFn: FetchLike = globalThis.fetch.bind(globalThis) as FetchLike;

describe("configFromEnv", () => {
  it("returns defaults when optional vars are unset", () => {
    const cfg = configFromEnv({
      OWUI_ADMIN_EMAIL: "admin@example.com",
      OWUI_ADMIN_PASSWORD: "pw",
      MCP_SERVER_URL: "http://canna-mcp:3001/sse",
    } as NodeJS.ProcessEnv);
    expect(cfg.baseUrl).toBe("http://localhost:8080");
    expect(cfg.mcpServerName).toBe("canna-dispensations");
    expect(cfg.mcpServerType).toBe("sse");
  });

  it("strips trailing slash from baseUrl", () => {
    const cfg = configFromEnv({
      OWUI_BASE_URL: "http://localhost:8080///",
      OWUI_ADMIN_EMAIL: "a@b",
      OWUI_ADMIN_PASSWORD: "x",
      MCP_SERVER_URL: "http://m",
    } as NodeJS.ProcessEnv);
    expect(cfg.baseUrl).toBe("http://localhost:8080");
  });

  it("throws when required vars are missing", () => {
    expect(() =>
      configFromEnv({ OWUI_ADMIN_EMAIL: "x" } as NodeJS.ProcessEnv),
    ).toThrow(/Missing required env vars/);
  });
});

describe("seed — fresh registration", () => {
  let state: MockState;
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    state = makeState();
    const started = await startMockServer(state);
    server = started.server;
    baseUrl = started.baseUrl;
  });

  afterAll(async () => {
    await stopServer(server);
  });

  it("registers canna-dispensations when not present", async () => {
    const cfg: SeedConfig = {
      baseUrl,
      adminEmail: "admin@canna.local",
      adminPassword: "secret",
      mcpServerName: "canna-dispensations",
      mcpServerUrl: "http://canna-mcp:3001/sse",
      mcpServerType: "sse",
    };
    const result = await seed(cfg, fetchFn);
    expect(result.status).toBe("registered");
    expect(result.connectionId).toBeDefined();
    expect(state.postCount).toBe(1);
    const payload = state.postPayloads[0] as {
      TOOL_SERVER_CONNECTIONS: Array<{ name: string; url: string; type: string }>;
    };
    expect(payload.TOOL_SERVER_CONNECTIONS).toHaveLength(1);
    expect(payload.TOOL_SERVER_CONNECTIONS[0]).toMatchObject({
      name: "canna-dispensations",
      url: "http://canna-mcp:3001/sse",
      type: "sse",
    });
  });
});

describe("seed — already registered (idempotent)", () => {
  let state: MockState;
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    state = makeState();
    state.toolServers = [
      {
        id: "preexisting-1",
        name: "canna-dispensations",
        url: "http://canna-mcp:3001/sse",
        type: "sse",
      },
    ];
    const started = await startMockServer(state);
    server = started.server;
    baseUrl = started.baseUrl;
  });

  afterAll(async () => {
    await stopServer(server);
  });

  it("returns already_registered and skips POST", async () => {
    const cfg: SeedConfig = {
      baseUrl,
      adminEmail: "admin@canna.local",
      adminPassword: "secret",
      mcpServerName: "canna-dispensations",
      mcpServerUrl: "http://canna-mcp:3001/sse",
      mcpServerType: "sse",
    };
    const result = await seed(cfg, fetchFn);
    expect(result.status).toBe("already_registered");
    expect(result.connectionId).toBe("preexisting-1");
    expect(state.postCount).toBe(0);
  });
});

describe("seed — signin failure (401)", () => {
  let state: MockState;
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    state = makeState();
    state.signinResponse = {
      status: 401,
      body: { detail: "invalid credentials" },
    };
    const started = await startMockServer(state);
    server = started.server;
    baseUrl = started.baseUrl;
  });

  afterAll(async () => {
    await stopServer(server);
  });

  it("returns failed status with HTTP 401 detail", async () => {
    const cfg: SeedConfig = {
      baseUrl,
      adminEmail: "admin@canna.local",
      adminPassword: "wrong",
      mcpServerName: "canna-dispensations",
      mcpServerUrl: "http://canna-mcp:3001/sse",
      mcpServerType: "sse",
    };
    const result = await seed(cfg, fetchFn);
    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/signin failed/);
    expect(result.error).toMatch(/401/);
  });

  it("main() returns exit code 1 on failure", async () => {
    const env: NodeJS.ProcessEnv = {
      OWUI_BASE_URL: baseUrl,
      OWUI_ADMIN_EMAIL: "admin@canna.local",
      OWUI_ADMIN_PASSWORD: "wrong",
      MCP_SERVER_URL: "http://canna-mcp:3001/sse",
    } as NodeJS.ProcessEnv;

    // Capture stdout write
    const original = process.stdout.write.bind(process.stdout);
    const captured: string[] = [];
    process.stdout.write = ((chunk: string | Uint8Array) => {
      captured.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
      return true;
    }) as typeof process.stdout.write;

    let code: number;
    try {
      code = await main(env, fetchFn);
    } finally {
      process.stdout.write = original;
    }

    expect(code).toBe(1);
    const out = captured.join("");
    const parsed = JSON.parse(out.trim()) as { status: string };
    expect(parsed.status).toBe("failed");
  });
});

describe("main — missing env vars", () => {
  it("returns exit 1 and prints failed JSON", async () => {
    const original = process.stdout.write.bind(process.stdout);
    const captured: string[] = [];
    process.stdout.write = ((chunk: string | Uint8Array) => {
      captured.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
      return true;
    }) as typeof process.stdout.write;

    let code: number;
    try {
      code = await main({} as NodeJS.ProcessEnv, fetchFn);
    } finally {
      process.stdout.write = original;
    }
    expect(code).toBe(1);
    const parsed = JSON.parse(captured.join("").trim()) as {
      status: string;
      error: string;
    };
    expect(parsed.status).toBe("failed");
    expect(parsed.error).toMatch(/Missing required env vars/);
  });
});
