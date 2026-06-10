# canna-oss — monorepo multi-app build (v0.2.1.1)
#
# Build from monorepo ROOT context. This ONE image carries all 3 apps
# (api/mcp/worker) — deploy targets pick the right entrypoint via CMD override.
#
#   docker build -f apps/api/Dockerfile -t canna-stack:v0.2.1.1 .

# ---- builder ----
FROM node:22.12-alpine AS builder

WORKDIR /app

# pnpm via npm (avoids corepack keyid drift). Pinned to monorepo version.
RUN npm install -g pnpm@10.29.3 tsx@4.19.2

# Copy workspace manifests first for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY tooling/ ./tooling/
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/
COPY apps/mcp/package.json ./apps/mcp/
COPY apps/worker/package.json ./apps/worker/

# Install deps for all three runnable apps in one shot
ENV CI=true
RUN pnpm install --frozen-lockfile \
  --filter @canna/api... \
  --filter @canna/mcp... \
  --filter @canna/worker...

# Now copy all app sources
COPY apps/api/ ./apps/api/
COPY apps/mcp/ ./apps/mcp/
COPY apps/worker/ ./apps/worker/

# ---- runtime ----
FROM node:22.12-alpine AS runtime

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

WORKDIR /app

# Install tsx globally for TS runtime (handles .js -> .ts resolution).
RUN npm install -g tsx@4.19.2

# Non-root
RUN addgroup -S canna && adduser -S canna -G canna

COPY --from=builder --chown=canna:canna /app /app

USER canna

EXPOSE 3000 3001 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

# Default = canna-api. mcp/worker roles override via docker run CMD.
CMD ["tsx", "apps/api/src/server.ts"]
