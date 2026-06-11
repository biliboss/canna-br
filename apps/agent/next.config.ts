import type { NextConfig } from "next";

/**
 * @canna/agent — Next 16 host for the canna-br Command Center + chat assistant.
 *
 * No withAui() wrapper needed: @assistant-ui/next is a fork-internal package
 * that isn't published on npm. The assistant-ui library works fine without it
 * at runtime; withAui() only adds build-time RSC annotations which aren't
 * required for the templates/mcp pattern.
 */
const nextConfig: NextConfig = {
  experimental: {
    // Required for @assistant-ui/react server components and streaming responses
  },
};

export default nextConfig;
