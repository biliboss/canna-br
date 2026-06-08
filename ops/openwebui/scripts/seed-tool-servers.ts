/**
 * seed-tool-servers.ts — Open WebUI v0.9.6 MCP tool-server seeder
 *
 * Background: OWUI v0.9.6 does NOT auto-import `mcp_config.json`. Tool servers
 * are persisted in DB table `tool_server_connection`, registered via UI or via
 * `POST /api/v1/configs/tool_servers`. This script automates the POST so a
 * Kamal `post-deploy` hook can guarantee the `canna-dispensations` MCP server
 * is wired after every deploy.
 *
 * Idempotent: if `canna-dispensations` is already present in the connection
 * list, the script skips the POST and exits 0 with `already_registered`.
 *
 * Environment variables:
 *   OWUI_BASE_URL       default `http://localhost:8080`
 *   OWUI_ADMIN_EMAIL    required
 *   OWUI_ADMIN_PASSWORD required
 *   MCP_SERVER_URL      required — e.g. `http://canna-mcp:3001/sse` (SSE) or
 *                       `node /opt/canna-mcp/server.js` (stdio reference)
 *   MCP_SERVER_NAME     default `canna-dispensations`
 *   MCP_SERVER_TYPE     default `sse` (also accepted: `stdio`, `http`)
 *
 * Output: a single JSON line on stdout describing the result.
 *   { "status": "registered", "connectionId": "..." }
 *   { "status": "already_registered", "connectionId": "..." }
 *   { "status": "failed", "error": "..." }
 *
 * Exit code: 0 on success (registered or already_registered), 1 on failure.
 *
 * Zero third-party deps: relies only on Node 20+ built-in `fetch`.
 */

export interface SeedConfig {
  readonly baseUrl: string;
  readonly adminEmail: string;
  readonly adminPassword: string;
  readonly mcpServerName: string;
  readonly mcpServerUrl: string;
  readonly mcpServerType: string;
}

export interface SeedResult {
  readonly status: "registered" | "already_registered" | "failed";
  readonly connectionId?: string;
  readonly error?: string;
}

interface ToolServerConnection {
  readonly id?: string;
  readonly name?: string;
  readonly url?: string;
  readonly type?: string;
}

interface ToolServersConfigResponse {
  readonly TOOL_SERVER_CONNECTIONS?: readonly ToolServerConnection[];
}

interface SigninResponse {
  readonly token?: string;
}

export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}>;

/**
 * Build SeedConfig from process.env, throwing if required vars are missing.
 */
export function configFromEnv(env: NodeJS.ProcessEnv): SeedConfig {
  const baseUrl = (env["OWUI_BASE_URL"] ?? "http://localhost:8080").replace(
    /\/+$/,
    "",
  );
  const adminEmail = env["OWUI_ADMIN_EMAIL"];
  const adminPassword = env["OWUI_ADMIN_PASSWORD"];
  const mcpServerUrl = env["MCP_SERVER_URL"];
  const mcpServerName = env["MCP_SERVER_NAME"] ?? "canna-dispensations";
  const mcpServerType = env["MCP_SERVER_TYPE"] ?? "sse";

  const missing: string[] = [];
  if (!adminEmail) missing.push("OWUI_ADMIN_EMAIL");
  if (!adminPassword) missing.push("OWUI_ADMIN_PASSWORD");
  if (!mcpServerUrl) missing.push("MCP_SERVER_URL");
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  return {
    baseUrl,
    adminEmail: adminEmail as string,
    adminPassword: adminPassword as string,
    mcpServerName,
    mcpServerUrl: mcpServerUrl as string,
    mcpServerType,
  };
}

async function signin(
  fetchFn: FetchLike,
  baseUrl: string,
  email: string,
  password: string,
): Promise<string> {
  const res = await fetchFn(`${baseUrl}/api/v1/auths/signin`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `signin failed: HTTP ${res.status.toString()} ${body.slice(0, 200)}`,
    );
  }
  const data = (await res.json()) as SigninResponse;
  if (!data.token) {
    throw new Error("signin response missing `token`");
  }
  return data.token;
}

async function getToolServers(
  fetchFn: FetchLike,
  baseUrl: string,
  token: string,
): Promise<readonly ToolServerConnection[]> {
  const res = await fetchFn(`${baseUrl}/api/v1/configs/tool_servers`, {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `GET tool_servers failed: HTTP ${res.status.toString()} ${body.slice(0, 200)}`,
    );
  }
  const data = (await res.json()) as
    | ToolServersConfigResponse
    | readonly ToolServerConnection[];
  if (Array.isArray(data)) {
    return data;
  }
  const cfg = data as ToolServersConfigResponse;
  return cfg.TOOL_SERVER_CONNECTIONS ?? [];
}

async function postToolServers(
  fetchFn: FetchLike,
  baseUrl: string,
  token: string,
  connections: readonly ToolServerConnection[],
): Promise<readonly ToolServerConnection[]> {
  const res = await fetchFn(`${baseUrl}/api/v1/configs/tool_servers`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ TOOL_SERVER_CONNECTIONS: connections }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `POST tool_servers failed: HTTP ${res.status.toString()} ${body.slice(0, 200)}`,
    );
  }
  const data = (await res.json()) as
    | ToolServersConfigResponse
    | readonly ToolServerConnection[];
  if (Array.isArray(data)) {
    return data;
  }
  const cfg = data as ToolServersConfigResponse;
  return cfg.TOOL_SERVER_CONNECTIONS ?? connections;
}

function findByName(
  list: readonly ToolServerConnection[],
  name: string,
): ToolServerConnection | undefined {
  return list.find((c) => c.name === name);
}

/**
 * Run the seed flow. Pure function over a SeedConfig + FetchLike; no I/O of
 * its own (no process.exit, no console.log) — caller wires those.
 */
export async function seed(
  config: SeedConfig,
  fetchFn: FetchLike,
): Promise<SeedResult> {
  try {
    const token = await signin(
      fetchFn,
      config.baseUrl,
      config.adminEmail,
      config.adminPassword,
    );

    const existing = await getToolServers(fetchFn, config.baseUrl, token);
    const found = findByName(existing, config.mcpServerName);
    if (found) {
      return {
        status: "already_registered",
        ...(found.id !== undefined ? { connectionId: found.id } : {}),
      };
    }

    const connectionId = `canna-mcp-${Date.now()}`;
    const newConn: ToolServerConnection & { path?: string; auth_type?: string; key?: string; description?: string; config?: Record<string, unknown>; info?: Record<string, unknown> } = {
      name: config.mcpServerName,
      url: config.mcpServerUrl,
      type: config.mcpServerType,
      // OWUI v0.9.6 schema requires `path` + `config` + `info`.
      path: "",
      auth_type: "none",
      key: "",
      description: "canna-oss MCP server (dispensations + compliance)",
      config: { enable: true },
      info: { id: connectionId, name: config.mcpServerName, description: "canna-oss MCP server" },
    };
    const next = [...existing, newConn];
    await postToolServers(fetchFn, config.baseUrl, token, next);

    const verify = await getToolServers(fetchFn, config.baseUrl, token);
    const created = findByName(verify, config.mcpServerName);
    if (!created) {
      return {
        status: "failed",
        error: "POST succeeded but verification did not find connection",
      };
    }
    return {
      status: "registered",
      ...(created.id !== undefined ? { connectionId: created.id } : {}),
    };
  } catch (err) {
    return {
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * CLI entrypoint — only runs when this module is the main module.
 */
export async function main(
  env: NodeJS.ProcessEnv,
  fetchFn: FetchLike,
): Promise<number> {
  let config: SeedConfig;
  try {
    config = configFromEnv(env);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stdout.write(
      `${JSON.stringify({ status: "failed", error: msg })}\n`,
    );
    return 1;
  }
  const result = await seed(config, fetchFn);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return result.status === "failed" ? 1 : 0;
}

// ESM main-module check: import.meta.url === argv[1]
const isMain = (() => {
  try {
    const argv1 = process.argv[1];
    if (!argv1) return false;
    const argvUrl = new URL(`file://${argv1}`).href;
    return argvUrl === import.meta.url;
  } catch {
    return false;
  }
})();

if (isMain) {
  void main(process.env, globalThis.fetch as unknown as FetchLike).then(
    (code) => {
      process.exit(code);
    },
  );
}
