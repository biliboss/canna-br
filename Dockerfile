# canna-br — single-image monorepo build for the v0.1.0 self-host stack.
#
# ONE OCI image carries all three TypeScript backend roles (api / mcp / worker).
# Each compose service runs the same image and overrides CMD to pick its role
# (Gabriel's "1 image, CMD per role" Kamal/compose pattern).
#
#   docker build -t canna-br:0.1.0 .
#   docker run --rm canna-br:0.1.0 tsx apps/api/src/server.ts      # api    (3000)
#   docker run --rm canna-br:0.1.0 tsx apps/mcp/src/main.ts        # mcp    (3001)
#   docker run --rm canna-br:0.1.0 tsx apps/worker/src/server.ts   # worker (health 3002)
#
# All three roles run via tsx: the mcp/worker sources import siblings with `.js`
# specifiers that resolve to `.ts` on disk, which plain `node --experimental-
# strip-types` does NOT rewrite — only tsx does.
#
# NOTE: apps/agent (Next.js / assistant-ui chat) is NOT built here. It depends on
# unpublished `link:` packages that live OUTSIDE this repo
# (~/.obsidian/.../mcp-app-base/packages/*), so it cannot build in a clean
# Docker context. See docker-compose.yml `agent` service + ops/docker/README.md
# for the self-host story (run it from its boilerplate, or use Zitadel/managed).

# ---------------------------------------------------------------------------
# Stage 1 — base: pinned Node + pnpm + tsx, shared by every later stage.
# ---------------------------------------------------------------------------
FROM node:22.12-alpine AS base
WORKDIR /app
# pnpm via npm (avoids corepack keyid drift); pinned to the monorepo version.
RUN npm install -g pnpm@10.29.3 tsx@4.19.2
ENV CI=true

# ---------------------------------------------------------------------------
# Stage 2 — deps: install workspace deps for the three runnable backends.
# Copy manifests first so this layer caches across source-only changes.
# ---------------------------------------------------------------------------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY tooling/ ./tooling/
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/
COPY apps/mcp/package.json ./apps/mcp/
COPY apps/worker/package.json ./apps/worker/
RUN pnpm install --frozen-lockfile \
  --filter @canna/api... \
  --filter @canna/mcp... \
  --filter @canna/worker...

# ---------------------------------------------------------------------------
# Stage 3 — build: bring in app sources and run the workspace build.
# The api/mcp/worker apps run TypeScript directly (tsx / --experimental-strip-types),
# so `pnpm -r build` only compiles packages that declare a build script; it is a
# no-op for apps with no build step. `|| true` keeps the image building even if a
# package has no build script.
# ---------------------------------------------------------------------------
FROM deps AS build
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY apps/mcp/ ./apps/mcp/
COPY apps/worker/ ./apps/worker/
RUN pnpm -r --if-present build || true

# ---------------------------------------------------------------------------
# Stage 4 — runtime: lean image with prod deps + built output, non-root.
# ---------------------------------------------------------------------------
FROM node:22.12-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0
WORKDIR /app

# tsx for the api role; mcp/worker use node --experimental-strip-types.
RUN npm install -g tsx@4.19.2

# Non-root runtime user.
RUN addgroup -S canna && adduser -S canna -G canna

# Carry the fully installed + built workspace from the build stage.
COPY --from=build --chown=canna:canna /app /app

USER canna

# api=3000, mcp=3001, worker health=3002 (one image, role picked by CMD).
EXPOSE 3000 3001 3002

# Default role = api. mcp / worker override CMD in docker-compose.yml.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" || exit 1

CMD ["tsx", "apps/api/src/server.ts"]
