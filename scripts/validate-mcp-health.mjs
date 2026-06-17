#!/usr/bin/env node
/**
 * validate-mcp-health.mjs — MCP smoke gate
 *
 * Boots apps/mcp (StreamableHTTP), asserts:
 *   1. GET /health → {ok:true}
 *   2. MCP ListTools count === EXPECTED_TOOL_COUNT
 *
 * Exit 0 = all good. Exit 1 = any stage failed.
 * Prints per-stage result to stdout.
 *
 * Used by: pnpm validate (root package.json)
 * Done-gate: documented in AGENTS.md § Done Gate
 */

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Must stay in sync with apps/mcp/src/tools/index.ts allTools array length.
const EXPECTED_TOOL_COUNT = 12;
const MCP_PORT = 3102; // use distinct port so we don't collide with a running server
const MCP_HOST = "127.0.0.1";
const BASE = `http://${MCP_HOST}:${MCP_PORT}`;
const BOOT_TIMEOUT_MS = 30_000;
const STAGE_TIMEOUT_MS = 10_000;

let ok = true;

function pass(stage, detail = "") {
  const suffix = detail ? ` — ${detail}` : "";
  process.stdout.write(`  [PASS] ${stage}${suffix}\n`);
}

function fail(stage, detail = "") {
  ok = false;
  const suffix = detail ? ` — ${detail}` : "";
  process.stdout.write(`  [FAIL] ${stage}${suffix}\n`);
}

function info(msg) {
  process.stdout.write(`  [INFO] ${msg}\n`);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(deadline) {
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(2_000) });
      if (r.ok) return true;
    } catch {
      // not ready yet
    }
    await sleep(500);
  }
  return false;
}

async function checkHealth() {
  const r = await fetch(`${BASE}/health`, {
    signal: AbortSignal.timeout(STAGE_TIMEOUT_MS),
  });
  if (!r.ok) {
    fail("GET /health", `HTTP ${r.status}`);
    return false;
  }
  const body = await r.json();
  if (body.ok !== true) {
    fail("GET /health", `body.ok !== true: ${JSON.stringify(body)}`);
    return false;
  }
  pass("GET /health", `ok=true name=${body.name ?? "?"} version=${body.version ?? "?"}`);
  return true;
}

async function mcpPost(payload) {
  const r = await fetch(`${BASE}/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      // Stub headers required by canna resolveContext (no real auth in smoke)
      "x-canna-user": "smoke-test",
      "x-canna-role": "DISPENSADOR",
      "x-canna-association": "smoke-assoc",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(STAGE_TIMEOUT_MS),
  });
  const text = await r.text();
  // StreamableHTTP may return text/event-stream or application/json
  const ct = r.headers.get("content-type") ?? "";
  if (ct.includes("text/event-stream")) {
    // Parse SSE: find the first "data:" line
    const dataLine = text.split("\n").find((l) => l.startsWith("data:"));
    if (!dataLine) return null;
    return JSON.parse(dataLine.slice(5).trim());
  }
  return JSON.parse(text);
}

async function checkListTools() {
  // MCP Streamable HTTP: send initialize first (required by spec)
  let initResult;
  try {
    initResult = await mcpPost({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "smoke-test", version: "0.0.1" },
      },
    });
  } catch (e) {
    fail("MCP initialize", String(e));
    return false;
  }

  if (!initResult || initResult.error) {
    fail("MCP initialize", JSON.stringify(initResult));
    return false;
  }
  pass("MCP initialize", `server=${initResult.result?.serverInfo?.name ?? "?"}`);

  // tools/list
  let listResult;
  try {
    listResult = await mcpPost({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    });
  } catch (e) {
    fail("MCP tools/list", String(e));
    return false;
  }

  if (!listResult || listResult.error) {
    fail("MCP tools/list", JSON.stringify(listResult));
    return false;
  }

  const tools = listResult.result?.tools ?? [];
  const count = tools.length;
  if (count !== EXPECTED_TOOL_COUNT) {
    fail(
      "MCP tools/list count",
      `got ${count}, expected ${EXPECTED_TOOL_COUNT}. tools=[${tools.map((t) => t.name).join(", ")}]`,
    );
    return false;
  }
  pass(
    "MCP tools/list count",
    `${count}/${EXPECTED_TOOL_COUNT} — [${tools.map((t) => t.name).join(", ")}]`,
  );
  return true;
}

async function main() {
  process.stdout.write("\n=== validate-mcp-health ===\n");

  // Boot MCP server as child process
  // DATABASE_URL set to a dummy value — health + ListTools don't hit DB.
  // Postgres connection is lazy (Emmett / Pongo only connects on first query).
  const mcpEntry = resolve(ROOT, "apps/mcp/src/main.ts");
  // Boot via tsx (esbuild-backed TS runner). `node --experimental-strip-types`
  // does NOT rewrite `.js` import specifiers to their `.ts` source under
  // Node >=23 (works in the Node 22.12 prod Docker image, breaks locally on
  // newer Node). tsx resolves them, so the smoke is runtime-independent.
  const require = createRequire(import.meta.url);
  const tsxCli = require.resolve("tsx/cli");
  info(`booting MCP server via tsx: ${mcpEntry} on port ${MCP_PORT}`);

  const child = spawn(
    "node",
    [tsxCli, mcpEntry],
    {
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL ?? "postgres://smoke:smoke@127.0.0.1:5432/smoke_dummy",
        PORT: String(MCP_PORT),
        HOST: MCP_HOST,
      },
      stdio: ["ignore", "pipe", "pipe"],
      cwd: ROOT,
    },
  );

  let bootErr = "";
  child.stderr.on("data", (d) => {
    const msg = d.toString();
    // relay boot messages for debugging; suppress after ready
    if (msg.includes("listening") || msg.includes("FATAL")) {
      info(`mcp stderr: ${msg.trim()}`);
    }
    bootErr += msg;
  });

  const deadline = Date.now() + BOOT_TIMEOUT_MS;
  const ready = await waitForServer(deadline);

  if (!ready) {
    fail("MCP server boot", `did not respond within ${BOOT_TIMEOUT_MS}ms. stderr=${bootErr.slice(0, 400)}`);
    child.kill("SIGTERM");
    process.exit(1);
  }
  pass("MCP server boot", `listening on ${BASE}`);

  try {
    const healthOk = await checkHealth();
    if (!healthOk) {
      child.kill("SIGTERM");
      process.exit(1);
    }
    await checkListTools();
  } finally {
    child.kill("SIGTERM");
  }

  process.stdout.write("\n");
  if (ok) {
    process.stdout.write("=== validate-mcp-health PASSED ===\n\n");
    process.exit(0);
  } else {
    process.stdout.write("=== validate-mcp-health FAILED ===\n\n");
    process.exit(1);
  }
}

main().catch((e) => {
  process.stderr.write(`validate-mcp-health fatal: ${e}\n`);
  process.exit(1);
});
