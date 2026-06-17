#!/usr/bin/env bash
# deploy-agent.sh — Deploy @canna/agent to app.cannabr.org
#
# Pattern: tar-pipe build context to VPS → docker build on VPS → run container
# → kamal-proxy wires app.cannabr.org (same pattern as canna-stack, validated 2026-06-16).
#
# kamal build push stays blocked on this VPS (SSH port-forward) — direct docker
# build + run is the ONLY deploy path here.
#
# Usage:
#   ./ops/agent/kamal/deploy-agent.sh              # build + run + wire route
#   ./ops/agent/kamal/deploy-agent.sh --route-only  # re-wire kamal-proxy (fresh IP after container restart)
#   ./ops/agent/kamal/deploy-agent.sh --verify-only # smoke test URLs
#
# Prerequisites:
#   - AGENT_BASIC_AUTH_PASS exported (set to empty string to disable gate)
#   - OPENROUTER_API_KEY exported (BYOK; can be empty for UI-only-key mode)
#   - SSH access to 62.171.145.76 as root (key in ssh-agent)
#
# ⚠️  BLAST-RADIUS GUARD — shared kamal-proxy on 62.171.145.76. NEVER run
#     `kamal proxy reboot`. Only `kamal-proxy deploy <service>` for host routing.

set -uo pipefail

VPS="${VPS:-62.171.145.76}"
IMAGE="canna-agent"
VERSION="${VERSION:-latest}"
CONTAINER_PORT=3002
CONTAINER_NAME="${IMAGE}-${VERSION}"
PREV_CONTAINER="${IMAGE}-prev"

ROUTE_ONLY="${1:-}"
VERIFY_ONLY="${ROUTE_ONLY:-}"

run() { ssh -o ConnectTimeout=10 "root@${VPS}" "$@"; }

# ──────────────────────────────────────────────────────────────────────────────
# 1. Smoke before starting
# ──────────────────────────────────────────────────────────────────────────────
echo "[1/5] Verifying MCP server (dependency) is live..."
run "curl -sf http://127.0.0.1:3001/health > /dev/null || echo 'WARN: MCP not reachable at 127.0.0.1:3001 — agent will start but MCP tools will be unavailable'"

if [[ "${ROUTE_ONLY}" == "--verify-only" ]]; then
  echo "--- verify URLs ---"
  for u in https://app.cannabr.org/health https://api.cannabr.org/health https://mcp.cannabr.org/health; do
    printf "%-45s " "$u"; curl -sS -o /dev/null -w "%{http_code}\n" --max-time 12 "$u" || echo "ERR"
  done
  exit 0
fi

if [[ "${ROUTE_ONLY}" != "--route-only" ]]; then
  # ────────────────────────────────────────────────────────────────────────────
  # 2. Tar-pipe build context to VPS and docker build
  # ────────────────────────────────────────────────────────────────────────────
  REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
  BUILD_CONTEXT="${REPO_ROOT}/apps/agent"
  echo "[2/5] Piping build context (${BUILD_CONTEXT}) to VPS..."
  # Exclude node_modules and .next from transfer — heavy and regenerated on VPS.
  tar -czf - -C "${BUILD_CONTEXT}" \
    --exclude="node_modules" \
    --exclude=".next" \
    . | run "mkdir -p /tmp/canna-agent-build && tar -xzf - -C /tmp/canna-agent-build"

  echo "[3/5] Building Docker image on VPS..."
  run "docker build -t ${IMAGE}:${VERSION} /tmp/canna-agent-build && rm -rf /tmp/canna-agent-build"
fi

# ──────────────────────────────────────────────────────────────────────────────
# 4. Run new container (graceful cutover)
# ──────────────────────────────────────────────────────────────────────────────
echo "[4/5] Starting container ${CONTAINER_NAME}..."

# Resolve MCP container IP (same network as canna-stack-mcp).
MCP_IP="$(run 'docker inspect -f "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" canna-stack-mcp-v0211 2>/dev/null || echo ""')" || MCP_IP=""
MCP_URL="http://127.0.0.1:3001"
if [[ -n "${MCP_IP}" ]]; then
  MCP_URL="http://${MCP_IP}:3001"
  echo "   MCP container IP=${MCP_IP} → MCP_SERVER_URL=${MCP_URL}"
else
  echo "   WARN: could not resolve MCP container IP; using ${MCP_URL}"
fi

# Rename current running container (if any) for rollback safety.
run "docker rename ${IMAGE}-latest ${PREV_CONTAINER} 2>/dev/null || true"
run "docker stop ${PREV_CONTAINER} 2>/dev/null || true"

run "docker run -d --name ${IMAGE}-latest --restart=unless-stopped \
  -p 127.0.0.1:${CONTAINER_PORT}:${CONTAINER_PORT} \
  -e NODE_ENV=production \
  -e MCP_ENABLED=1 \
  -e MCP_SERVER_URL=${MCP_URL} \
  -e NEXT_PUBLIC_DOCS_URL=https://docs.cannabr.org \
  -e AGENT_BASIC_AUTH_USER=canna \
  -e AGENT_BASIC_AUTH_PASS=${AGENT_BASIC_AUTH_PASS:-} \
  -e OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-} \
  ${IMAGE}:${VERSION}"

# Wait for health
echo "   Waiting for /health..."
for i in {1..12}; do
  if run "curl -sf http://127.0.0.1:${CONTAINER_PORT}/health > /dev/null"; then
    echo "   /health OK"
    break
  fi
  [[ $i -eq 12 ]] && { echo "ERROR: container did not become healthy"; exit 1; }
  sleep 5
done

# Remove old container now that new one is healthy.
run "docker rm -f ${PREV_CONTAINER} 2>/dev/null || true"

# ──────────────────────────────────────────────────────────────────────────────
# 5. Wire kamal-proxy route for app.cannabr.org
# ──────────────────────────────────────────────────────────────────────────────
echo "[5/5] Wiring kamal-proxy route app.cannabr.org → 127.0.0.1:${CONTAINER_PORT}..."
AGENT_IP="$(run "docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${IMAGE}-latest")"

run "docker exec kamal-proxy kamal-proxy deploy canna-agent-org \
  --target ${AGENT_IP}:${CONTAINER_PORT} --host app.cannabr.org --tls \
  --health-check-path /health --deploy-timeout 30s"

echo ""
echo "--- verify ---"
for u in https://app.cannabr.org/health https://api.cannabr.org/health https://mcp.cannabr.org/health; do
  printf "%-45s " "$u"; curl -sS -o /dev/null -w "%{http_code}\n" --max-time 12 "$u" || echo "ERR"
done

echo ""
echo "✓ canna-agent deployed at https://app.cannabr.org"
echo "  Rollback: docker run -d --name ${IMAGE}-latest ... ${IMAGE}:<prev-tag>"
