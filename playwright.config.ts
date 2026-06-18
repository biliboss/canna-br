import { defineConfig, devices } from "@playwright/test";

// Production e2e harness — targets the LIVE MCP server, no local webServer.
// Base URL is for the in-page widget render (about:blank + setContent); the
// MCP protocol calls use the SDK client with CANNA_MCP_URL (see e2e/lib).
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 60_000,
  use: {
    ...devices["Desktop Chrome"],
    headless: true,
  },
});
