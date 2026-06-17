#!/usr/bin/env bash
#
# cb-e2e-gate-pre-merge — LOCAL-FIRST e2e gate (wave.9).
#
# Brings up the deterministic local MCP stack (local-mcp-harness.sh up), runs
# the wave.8 JOURNEY + WIDGET e2es against it, then tears the stack down. A red
# e2e exits non-zero so it BLOCKS a `git push` when wired as a lefthook pre-push
# command. This is the gate the local-CI-by-hooks premise calls for: it actually
# runs here, on the dev box, against a real seeded Postgres + MCP server — no GH
# Actions runner required.
#
#   e2e/lib/run-gate.sh
#
# WHY THIS FILE LIST (and not `playwright test`):
#   member-quota-card.e2e.ts is a PRODUCTION probe (mcp-prod-client.ts, fixed
#   PROD seed member 01HM0MEMBER…001) — it asserts against the live prod MCP and
#   is NOT deterministic against the local harness (the local seed event log does
#   not contain that prod member). It runs as part of `pnpm test:e2e:prod` against
#   CANNA_MCP_URL=https://mcp.cannabr.org, NOT in this local pre-push gate. The
#   six suites below are SELF-CONTAINED: each mints its own member / reads state
#   the local seed projects, so they go green deterministically offline.
#
# Skips cleanly (exit 0) when docker is unavailable — the gate is best-effort on
# boxes without docker, the same way deploy is docker-direct elsewhere. Set
# CB_E2E_GATE_REQUIRE_DOCKER=1 to make a missing docker a HARD failure instead.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HARNESS="${REPO_ROOT}/e2e/lib/local-mcp-harness.sh"
MCP_URL="http://localhost:3001"

# The deterministic, harness-targeted suites (see header).
GATE_SPECS=(
  e2e/dispensation-flow.e2e.ts
  e2e/dispensation-form.widget.e2e.ts
  e2e/lgpd-lifecycle.e2e.ts
  e2e/member-lifecycle-board.widget.e2e.ts
  e2e/register-member.e2e.ts
  e2e/traceability-timeline.widget.e2e.ts
)

log() { printf '[e2e-gate] %s\n' "$*" >&2; }

if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  if [ "${CB_E2E_GATE_REQUIRE_DOCKER:-0}" = "1" ]; then
    log "docker unavailable and CB_E2E_GATE_REQUIRE_DOCKER=1 — FAILING gate"
    exit 1
  fi
  log "docker unavailable — SKIPPING e2e gate (set CB_E2E_GATE_REQUIRE_DOCKER=1 to enforce)"
  exit 0
fi

cleanup() { bash "${HARNESS}" down >/dev/null 2>&1 || true; }
trap cleanup EXIT

log "bringing up local MCP stack"
if ! bash "${HARNESS}" up >&2; then
  log "harness failed to come up — FAILING gate"
  exit 1
fi

log "running journey + widget e2es against ${MCP_URL}"
cd "${REPO_ROOT}"
CANNA_MCP_URL="${MCP_URL}" ./node_modules/.bin/playwright test "${GATE_SPECS[@]}"
rc=$?

if [ "$rc" -ne 0 ]; then
  log "e2e RED (rc=${rc}) — BLOCKING push"
  exit "$rc"
fi
log "e2e GREEN — gate passed"
exit 0
