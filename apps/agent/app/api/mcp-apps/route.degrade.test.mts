/**
 * Gap #4 proof — mcp-apps route degrades gracefully when the MCP host is down.
 *
 * apps/agent is excluded from the pnpm workspace and has no vitest. This is a
 * self-contained assertion script (exits non-zero on failure) so it runs with
 * the repo-root tsx, no extra dependency:
 *
 *   cd apps/agent && pnpm install --ignore-workspace
 *   node --import tsx app/api/mcp-apps/route.degrade.test.mts
 *
 * It points MCP_SERVER_URL at a guaranteed-refused port (127.0.0.1:9) so
 * getMcpClient() rejects at connect time, and asserts the POST handler returns
 * a structured 503 (NOT a raw 500 / unhandled throw). Before commit 0368b03
 * this surfaced a bare 500; the route.ts guard + this test lock the contract.
 */

// Must be set BEFORE importing the route (mcp-client reads it lazily, but the
// singleton promise is created on first getMcpClient() call inside POST).
process.env.MCP_SERVER_URL = "http://127.0.0.1:9"; // ECONNREFUSED, immediate

const fail = (msg: string): never => {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
};

const { POST } = await import("./route.ts");

const call = (body: unknown) =>
  POST(
    new Request("http://local/api/mcp-apps", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

// 1) tools/call with the MCP host down → graceful 503 (not 500, not a throw).
{
  const res = await call({
    method: "tools/call",
    id: 1,
    params: { name: "get_member_quota", arguments: {} },
  });
  if (res.status === 500) fail(`tools/call returned raw 500 (gap #4 regressed)`);
  if (res.status !== 503) fail(`tools/call expected 503, got ${res.status}`);
  const body = (await res.json()) as { error?: { code?: number; data?: { retryable?: boolean } } };
  if (body.error?.code !== -32001)
    fail(`expected structured error code -32001, got ${JSON.stringify(body)}`);
  if (body.error?.data?.retryable !== true)
    fail(`expected retryable:true in degrade payload, got ${JSON.stringify(body)}`);
  console.log(`PASS: tools/call → 503 structured degrade (code -32001, retryable)`);
}

// 2) read-resource with the MCP host down → also degrades to 503, not 500.
{
  const res = await call({
    method: "mcp-apps/read-resource",
    id: 2,
    params: { uri: "ui://member-quota-card/app.html" },
  });
  if (res.status === 500) fail(`read-resource returned raw 500 (gap #4 regressed)`);
  if (res.status !== 503) fail(`read-resource expected 503, got ${res.status}`);
  console.log(`PASS: read-resource → 503 graceful degrade`);
}

console.log("ALL PASS — mcp-apps route degrades gracefully when MCP host is down");
