#!/usr/bin/env bash
#
# Bring up a deterministic LOCAL canna MCP stack for the wave.8 journey e2es so
# they run reproducibly and never pollute production:
#
#   1. ephemeral Postgres 16 container (canna-e2e-pg) on host :55432
#   2. apply the read-model schema (scripts/migrate.ts)
#   3. project the deterministic seed event log (scripts/seed.ts → wave.7 seed)
#   4. start the MCP server (apps/mcp/src/main.ts) with JWT_SECRET UNSET
#      (DEV header-auth mode — the x-canna-role header is trusted, matching
#      the prod header-auth stub the live tests already rely on) on :3001.
#
# Usage:
#   e2e/lib/local-mcp-harness.sh up     # start everything, wait for /health
#   e2e/lib/local-mcp-harness.sh down   # tear down pg + mcp
#
# CANNA_MCP_URL must then point at http://localhost:3001 (the playwright runner
# wrapper sets it). Idempotent: `up` reuses a running pg, re-seed is a no-op
# full-replay.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PG_CONTAINER="canna-e2e-pg"
PG_PORT="55432"
PG_PASS="canna"
DB_URL="postgres://canna:${PG_PASS}@localhost:${PG_PORT}/canna"
MCP_PORT="3001"
MCP_PID_FILE="${REPO_ROOT}/.e2e-mcp.pid"
MCP_LOG="${REPO_ROOT}/.e2e-mcp.log"

log() { printf '[harness] %s\n' "$*" >&2; }

up() {
  # --- Postgres -----------------------------------------------------------
  if [ -n "$(docker ps -q -f name="^${PG_CONTAINER}$")" ]; then
    log "pg already running"
  else
    docker rm -f "${PG_CONTAINER}" >/dev/null 2>&1 || true
    log "starting postgres container ${PG_CONTAINER} on :${PG_PORT}"
    docker run -d --name "${PG_CONTAINER}" \
      -e POSTGRES_DB=canna -e POSTGRES_USER=canna -e POSTGRES_PASSWORD="${PG_PASS}" \
      -p "${PG_PORT}:5432" postgres:16-alpine >/dev/null
  fi

  log "waiting for pg ready"
  for _ in $(seq 1 30); do
    if docker exec "${PG_CONTAINER}" pg_isready -U canna -d canna >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  # --- migrate: apply the read-model schema DIRECTLY via psql. (scripts/
  #     migrate.ts imports `pg` which is not resolvable from the repo root, so
  #     we pipe the canonical migration SQL into the container. ON_ERROR_STOP=0
  #     tolerates the unguarded CREATE RULE statements on re-run.) -----------
  log "migrating schema"
  docker exec -i "${PG_CONTAINER}" psql -U canna -d canna -v ON_ERROR_STOP=0 \
    < "${REPO_ROOT}/packages/read-models/migrations/0001-init.sql" >/dev/null 2>&1 || \
    log "migrate had non-fatal errors (rules already exist — continuing)"

  # --- seed (deterministic full-replay, idempotent). Uses the e2e runner in
  #     apps/mcp/src (resolves @canna/read-models + pg); root scripts/seed.ts
  #     cannot resolve those from the non-package repo root. -----------------
  log "seeding deterministic events"
  ( cd "${REPO_ROOT}" && DATABASE_URL="${DB_URL}" \
      ./node_modules/.bin/tsx apps/mcp/src/e2e-seed-runner.ts ) >&2

  # --- MCP server (DEV header-auth: JWT_SECRET unset) ---------------------
  if curl -fsS "http://localhost:${MCP_PORT}/health" >/dev/null 2>&1; then
    log "mcp already healthy on :${MCP_PORT}"
    return 0
  fi
  log "starting mcp server on :${MCP_PORT}"
  ( cd "${REPO_ROOT}" && DATABASE_URL="${DB_URL}" PORT="${MCP_PORT}" HOST=127.0.0.1 \
      tsx apps/mcp/src/main.ts >"${MCP_LOG}" 2>&1 & echo $! >"${MCP_PID_FILE}" )

  log "waiting for mcp /health"
  for _ in $(seq 1 30); do
    if curl -fsS "http://localhost:${MCP_PORT}/health" >/dev/null 2>&1; then
      log "mcp healthy"
      return 0
    fi
    sleep 1
  done
  log "mcp did not become healthy — log tail:"; tail -n 30 "${MCP_LOG}" >&2
  return 1
}

down() {
  if [ -f "${MCP_PID_FILE}" ]; then
    kill "$(cat "${MCP_PID_FILE}")" >/dev/null 2>&1 || true
    rm -f "${MCP_PID_FILE}"
  fi
  pkill -f "apps/mcp/src/main.ts" >/dev/null 2>&1 || true
  docker rm -f "${PG_CONTAINER}" >/dev/null 2>&1 || true
  log "torn down"
}

case "${1:-up}" in
  up) up ;;
  down) down ;;
  *) echo "usage: $0 up|down" >&2; exit 2 ;;
esac
