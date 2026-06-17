import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

/**
 * @canna/agent — Next 16 host for the canna-br Command Center + chat assistant.
 *
 * No withAui() wrapper needed: @assistant-ui/next is a fork-internal package
 * that isn't published on npm. The assistant-ui library works fine without it
 * at runtime; withAui() only adds build-time RSC annotations which aren't
 * required for the templates/mcp pattern.
 */
const nextConfig: NextConfig = {
  // Self-contained Docker image: emits .next/standalone/server.js with a
  // minimal node_modules tracing, so the runtime stage doesn't need pnpm.
  output: "standalone",
  // Pin tracing root to THIS dir. apps/agent is workspace-excluded and builds
  // with --ignore-workspace, but Next still walks up and finds the repo root,
  // nesting the output under .next/standalone/apps/agent/. Pinning here keeps
  // server.js flat at .next/standalone/server.js (matches Dockerfile COPY).
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  experimental: {
    // Required for @assistant-ui/react server components and streaming responses
  },
};

export default nextConfig;
