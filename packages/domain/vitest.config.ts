import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const agentReporterPath = fileURLToPath(
  new URL(
    "../../tooling/test-utils/dist/agent-reporter.mjs",
    import.meta.url,
  ),
);

export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts"],
    passWithNoTests: true,
    reporters:
      process.env["VITEST_AGENT_REPORTER"] === "1"
        ? [agentReporterPath]
        : ["default"],
    server: {
      deps: {
        inline: [/@canna\//],
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.spec.ts", "src/**/index.ts"],
    },
  },
});
