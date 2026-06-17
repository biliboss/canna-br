# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# @canna/agent — self-contained image for app.cannabr.org.
#
# IMPORTANT: build context is THIS directory (apps/agent/), NOT the repo root.
# apps/agent is workspace-EXCLUDED (pnpm-workspace.yaml `- "!apps/agent"`) and
# the assistant-ui fork pkgs are vendored as committed dist under vendor/, so it
# builds standalone with --ignore-workspace. No repo-root files are needed.
#
#   docker build -t canna-agent:latest apps/agent/
# ---------------------------------------------------------------------------

# ---- builder ----
FROM node:22-alpine AS builder
WORKDIR /app
RUN npm i -g pnpm@10.29.3
# Lockfile + manifest first for layer caching.
COPY package.json pnpm-lock.yaml ./
# vendor/ holds committed fork dist referenced via file: deps — needed to install.
COPY vendor ./vendor
RUN pnpm install --ignore-workspace --frozen-lockfile
COPY . .
RUN pnpm build

# ---- runtime ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3002 \
    HOSTNAME=0.0.0.0
# Next standalone output: server.js + traced node_modules.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3002/health || exit 1
CMD ["node", "server.js"]
