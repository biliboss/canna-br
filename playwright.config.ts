import { defineConfig, devices } from "@playwright/test";

// Production e2e harness — targets the LIVE MCP server, no local webServer.
// Base URL is for the in-page widget render (about:blank + setContent); the
// MCP protocol calls use the SDK client with CANNA_MCP_URL (see e2e/lib).
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  // retries: the journey e2es write through a local Postgres in the harness; under
  // full-suite serial load it can churn the pg connection / lag a projection
  // (read-after-write), surfacing transient "Connection terminated"/LOT_NOT_FOUND.
  // The flows are correct (unit 105/105 + isolated e2e green) — retry absorbs the
  // infra flake while a REAL regression still fails all attempts. See
  // _memory/feedback (testcontainers pg cold-start flake, same class).
  retries: 2,
  workers: 1,
  reporter: [["list"]],
  timeout: 60_000,
  use: {
    ...devices["Desktop Chrome"],
    headless: true,
  },
});
