#!/usr/bin/env bash
# ops/ship.sh — canna-br CD ring (deploy-script, NO vendor). The deploy half of
# `bin/ship` (push → pre-push gate → deploy). Rollback-safe, idempotent.
#
# Scope: rebuilds + cutover the ROLES that changed. For OKF (v0.2.1.5) only the
# MCP role (serves okf:// resources + needs okf/ in the image) and the AGENT
# (getOkfContext) change — web/projection stay put. Pass --full to cutover all.
#
# Every deploy gotcha baked (see _memory/feedback-canna-agent-deploy):
#   --network kamal · JWT_SECRET consistent mcp+agent · health via
#   `docker inspect .State.Health.Status` (Next/standalone imgs lack curl) ·
#   re-flip kamal-proxy route after EVERY restart (IP changes) · okf/ in build ctx.
#
# Usage:  ops/ship.sh <version> [--full] [--verify-only]
#         ops/ship.sh v0.2.1.5
#
# ⚠ Shared kamal-proxy. NEVER `kamal proxy reboot`. Only `kamal-proxy deploy <svc>`.

set -uo pipefail

VER="${1:?usage: ops/ship.sh <version>  (e.g. v0.2.1.5)}"
VPS="${VPS:-62.171.145.76}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAG="${VER//./}"                 # v0.2.1.5 -> v0215 (container-name key)
run() { ssh -o ConnectTimeout=15 "root@${VPS}" "$@"; }

verify() {
  echo "--- verify live ---"
  for u in https://mcp.cannabr.org/health https://api.cannabr.org/health https://app.cannabr.org/health; do
    printf "%-38s " "$u"; curl -sS -o /dev/null -w "%{http_code}\n" --max-time 12 "$u" || echo ERR
  done
  echo "--- okf/domain present in live mcp image ---"
  run "docker exec canna-stack-mcp-${TAG} sh -c 'ls /app/okf/domain/*.md 2>/dev/null | wc -l'" 2>/dev/null \
    | awk '{print "  okf/domain .md served: "$1}'
}

[ "${2:-}" = "--verify-only" ] || [ "${3:-}" = "--verify-only" ] && { verify; exit 0; }

# ── 1. tar-pipe build context (okf/ INCLUDED; docs/node_modules/.next excluded) ──
echo "[1/4] tar-pipe build context → VPS"
tar -czf - -C "$REPO_ROOT" \
  --exclude="node_modules" --exclude=".next" --exclude="apps/docs" --exclude=".git" \
  . | run "rm -rf /tmp/canna-ship && mkdir -p /tmp/canna-ship && tar -xzf - -C /tmp/canna-ship && echo ok-ctx"

# ── 2. build canna-stack:<VER> (apps/mcp/Dockerfile COPY okf/ → bundle in image) ──
echo "[2/4] build canna-stack:${VER} on VPS"
run "cd /tmp/canna-ship && docker build -f apps/mcp/Dockerfile -t canna-stack:${VER} . 2>&1 | tail -2 && rm -rf /tmp/canna-ship"

# ── 3. cutover MCP role (rollback-safe; reuse prev container's env on the VPS) ──
echo "[3/4] cutover canna-stack-mcp → ${VER}"
run bash -s <<EOF
set -uo pipefail
PREV=\$(docker ps --filter 'name=canna-stack-mcp-' --format '{{.Names}}' | head -1)
[ -z "\$PREV" ] && { echo "ERR: no running mcp container"; exit 1; }
echo "  prev=\$PREV"
docker inspect "\$PREV" --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -E '^(NODE_ENV|MCP_ENABLED|MCP_SERVER_URL|DATABASE_URL|REDIS_URL|JWT_SECRET|SITE_KEK_SEED|NEXT_PUBLIC_DOCS_URL|CANNA_)' > /tmp/mcp.env
NEW=canna-stack-mcp-${TAG}
docker rm -f "\$NEW" 2>/dev/null || true
docker run -d --name "\$NEW" --restart=unless-stopped --network kamal \
  -p 127.0.0.1:3001:3001 --env-file /tmp/mcp.env canna-stack:${VER}
for i in \$(seq 1 24); do
  st=\$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "\$NEW" 2>/dev/null)
  [ "\$st" = healthy ] && { echo "  healthy"; break; }
  [ "\$st" = none ] && { sleep 2; docker exec "\$NEW" sh -c 'wget -qO- http://localhost:3001/health >/dev/null 2>&1' && { echo "  health(probe) ok"; break; }; }
  [ \$i -eq 24 ] && { echo "ERR health timeout st=\$st — rollback"; docker rm -f "\$NEW"; exit 1; }
  sleep 3
done
IP=\$(docker inspect -f '{{.NetworkSettings.Networks.kamal.IPAddress}}' "\$NEW")
docker exec kamal-proxy kamal-proxy deploy canna-mcp-org --target \${IP}:3001 --host mcp.cannabr.org --tls --health-check-path /health --deploy-timeout 30s
[ "\$PREV" != "\$NEW" ] && docker rm -f "\$PREV" 2>/dev/null || true
echo "  mcp live: \$NEW @ \$IP"
EOF

# ── 4. cutover canna-agent (getOkfContext) — rollback-safe, PRESERVE live env ──
# Do NOT use ops/agent/kamal/deploy-agent.sh: it predates the auth work and does
# not set JWT_SECRET / CANNA_* — rebuilding via it would drop the agent's signing
# env and break MCP auth. Instead reuse the RUNNING agent's env (already correct:
# JWT_SECRET == mcp's, CANNA_ROLE/USER/ASSOCIATION, MCP_SERVER_URL=container-name).
echo "[4/4] cutover canna-agent (getOkfContext) — preserve live env"
echo "[4a] tar-pipe agent build context → VPS"
tar -czf - -C "$REPO_ROOT/apps/agent" \
  --exclude="node_modules" --exclude=".next" . \
  | run "rm -rf /tmp/canna-agent-ship && mkdir -p /tmp/canna-agent-ship && tar -xzf - -C /tmp/canna-agent-ship && echo ok-agent-ctx"
run "cd /tmp/canna-agent-ship && docker build -t canna-agent:${TAG} . 2>&1 | tail -2 && rm -rf /tmp/canna-agent-ship"
run bash -s <<EOF
set -uo pipefail
PREV=\$(docker ps --filter 'name=canna-agent-latest' --format '{{.Names}}' | head -1)
[ -z "\$PREV" ] && { echo "ERR: no running agent container"; exit 1; }
docker inspect "\$PREV" --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | grep -E '^(NODE_ENV|MCP_SERVER_URL|MCP_ENABLED|JWT_SECRET|OPENROUTER_API_KEY|AGENT_BASIC_AUTH_USER|AGENT_BASIC_AUTH_PASS|NEXT_PUBLIC_DOCS_URL|CANNA_)' > /tmp/agent.env
docker rename canna-agent-latest canna-agent-prev
docker stop canna-agent-prev >/dev/null
docker run -d --name canna-agent-latest --restart=unless-stopped --network kamal \
  -p 127.0.0.1:3002:3002 --env-file /tmp/agent.env canna-agent:${TAG}
for i in \$(seq 1 24); do
  st=\$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' canna-agent-latest 2>/dev/null)
  [ "\$st" = healthy ] && { echo "  agent healthy"; break; }
  [ \$i -eq 24 ] && { echo "ERR agent health timeout st=\$st — rollback"; docker rm -f canna-agent-latest; docker rename canna-agent-prev canna-agent-latest; docker start canna-agent-latest; IP=\$(docker inspect -f '{{.NetworkSettings.Networks.kamal.IPAddress}}' canna-agent-latest); docker exec kamal-proxy kamal-proxy deploy canna-app-org --target \${IP}:3002 --host app.cannabr.org --tls --health-check-path /health; exit 1; }
  sleep 3
done
IP=\$(docker inspect -f '{{.NetworkSettings.Networks.kamal.IPAddress}}' canna-agent-latest)
docker exec kamal-proxy kamal-proxy deploy canna-app-org --target \${IP}:3002 --host app.cannabr.org --tls --health-check-path /health --deploy-timeout 30s
docker rm -f canna-agent-prev 2>/dev/null || true
echo "  agent live @ \$IP"
EOF

verify
echo "✓ ship ${VER}: mcp+agent cutover done. Review verify output."
