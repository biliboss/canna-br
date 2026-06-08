# canna-oss apps/mcp — multi-stage Docker build
#
# STATUS (2026-06-08): NOT YET BUILDABLE.
#
# Missing prerequisites in v0.2.1:
#   1. apps/mcp/src/server.ts exports createCannaMcpServer() but does NOT
#      attach a transport. For Docker/Kamal we need EITHER:
#        (a) stdio mode: a thin wrapper that
#             `await server.connect(new StdioServerTransport())`
#            — only useful when OWUI spawns the binary directly (sidecar).
#        (b) HTTP/SSE mode: server.connect(new SSEServerTransport(...)) on
#            port 3001 — required for canna-oss to expose
#            `mcp.canna.fonsecagabriel.com.br` over the network.
#      Pick one and add as apps/mcp/src/main.ts (or wire it into server.ts).
#   2. Same pnpm-workspace + tsc-emit concerns as apps/api.

FROM node:20.18-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY tooling/ ./tooling/
COPY packages/ ./packages/
COPY apps/mcp/package.json ./apps/mcp/

RUN pnpm install --frozen-lockfile --filter @canna/mcp...

COPY apps/mcp/ ./apps/mcp/

RUN pnpm --filter @canna/mcp... build || true
RUN pnpm prune --prod

# ---- runtime ----
FROM node:20.18-alpine AS runtime

ENV NODE_ENV=production \
    MCP_PORT=3001 \
    MCP_HOST=0.0.0.0

WORKDIR /app

RUN addgroup -S canna && adduser -S canna -G canna

COPY --from=builder --chown=canna:canna /app /app

USER canna

EXPOSE 3001

# Healthcheck only meaningful if MCP runs in HTTP/SSE mode.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health || exit 1

CMD ["node", "--experimental-strip-types", "apps/mcp/src/main.ts"]
