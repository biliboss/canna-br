# canna-oss apps/mcp — multi-stage Docker build (v0.2.1.1)
#
# Build from monorepo ROOT context:
#   docker buildx build --platform linux/amd64 -f apps/mcp/Dockerfile -t canna-mcp:v0.2.1.1 .

FROM node:22.12-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@10.29.3

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
COPY tooling/ ./tooling/
COPY packages/ ./packages/
COPY apps/mcp/package.json ./apps/mcp/

RUN pnpm install --frozen-lockfile --filter @canna/mcp...

COPY apps/mcp/ ./apps/mcp/

RUN pnpm prune --prod || true

# ---- runtime ----
FROM node:22.12-alpine AS runtime

ENV NODE_ENV=production \
    PORT=3001 \
    HOST=0.0.0.0

WORKDIR /app

RUN addgroup -S canna && adduser -S canna -G canna

COPY --from=builder --chown=canna:canna /app /app

USER canna

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/health || exit 1

CMD ["node", "--experimental-strip-types", "--no-warnings=ExperimentalWarning", "apps/mcp/src/main.ts"]
