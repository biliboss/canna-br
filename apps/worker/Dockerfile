# canna-oss apps/worker — multi-stage Docker build
#
# STATUS (2026-06-08): NOT YET BUILDABLE.
#
# Missing prerequisites in v0.2.1:
#   1. apps/worker exports createCannaWorker() but has no src/server.ts that:
#        - reads REDIS_URL,
#        - instantiates BullMQ Worker(s) for sngpc-submission/dispensation-pdf/
#          member-email queues,
#        - keeps the process alive,
#        - handles SIGTERM by closing the workers.
#      → Need: apps/worker/src/server.ts wiring all 3 processors.
#   2. Same pnpm-workspace concerns as apps/api.

FROM node:20.18-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY tooling/ ./tooling/
COPY packages/ ./packages/
COPY apps/worker/package.json ./apps/worker/

RUN pnpm install --frozen-lockfile --filter @canna/worker...

COPY apps/worker/ ./apps/worker/

RUN pnpm --filter @canna/worker... build || true
RUN pnpm prune --prod

# ---- runtime ----
FROM node:20.18-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /app

RUN addgroup -S canna && adduser -S canna -G canna

COPY --from=builder --chown=canna:canna /app /app

USER canna

# Worker has no HTTP surface — no EXPOSE. Healthcheck via process liveness.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD pgrep -f "apps/worker/src/server.ts" || exit 1

CMD ["node", "--experimental-strip-types", "apps/worker/src/server.ts"]
