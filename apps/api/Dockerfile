# canna-oss apps/api — multi-stage Docker build
#
# STATUS (2026-06-08): NOT YET BUILDABLE.
#
# Missing prerequisites in v0.2.1:
#   1. apps/api has no src/server.ts that calls `app.listen({port,host})`.
#      Only createCannaApi() builder + library exports exist.
#      → Need: apps/api/src/server.ts that
#               (a) instantiates the Emmett event store (PG or in-memory),
#               (b) calls createCannaApi({store, now: () => new Date()}),
#               (c) listens on PORT=3000, host '0.0.0.0',
#               (d) handles SIGTERM gracefully.
#   2. No `build` script in apps/api/package.json — TS is run via
#      `node --experimental-strip-types` in dev. Production needs a tsc
#      emit step OR continued use of strip-types at runtime.
#   3. pnpm workspace deps (@canna/*) must be resolvable inside the image.
#      Either: pnpm deploy --prod, or copy the whole monorepo and run
#      `pnpm install --frozen-lockfile` inside the build stage.
#
# Until those land, this Dockerfile is a *plan*, not a build target.

# ---- builder ----
FROM node:20.18-alpine AS builder

WORKDIR /app

# pnpm via corepack (pinned to matched monorepo version)
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

# Copy workspace manifests first for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY tooling/ ./tooling/
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --filter @canna/api...

# Now copy sources
COPY apps/api/ ./apps/api/

# Production install + (future) tsc build
RUN pnpm --filter @canna/api... build || true  # noop until tsc emits dist/
RUN pnpm prune --prod

# ---- runtime ----
FROM node:20.18-alpine AS runtime

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0

WORKDIR /app

# Non-root
RUN addgroup -S canna && adduser -S canna -G canna

COPY --from=builder --chown=canna:canna /app /app

USER canna

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

# Entrypoint — REQUIRES apps/api/src/server.ts to exist (see top of file).
# Until then this CMD will fail at runtime.
CMD ["node", "--experimental-strip-types", "apps/api/src/server.ts"]
