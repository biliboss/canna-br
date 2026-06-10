import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.spec.ts", "src/**/__tests__/*.spec.ts"],
    passWithNoTests: true,
    server: { deps: { inline: [/@canna\//] } },
  },
});
