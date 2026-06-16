#!/usr/bin/env bash
# add-cannabr-routes.sh — provision cannabr.org host routes on the SHARED kamal-proxy.
#
# Adds, as STANDALONE proxy services (NOT canna-stack roles), host routes that
# point at the already-running canna-stack containers:
#   mcp.cannabr.org -> canna-stack-mcp container :3001   (service: canna-mcp-org)
#   api.cannabr.org -> canna-stack-web container :3000   (service: canna-api-org)
#
# Mirrors the pre-existing pattern used for app.cannabr.org (service canna-app-org)
# and cannabr.org (service canna-br-org): a host-add on the ALREADY-RUNNING proxy.
#
# ⚠️ BLAST-RADIUS GUARD — the kamal-proxy on 62.171.145.76 is SHARED by blu-omie,
#    langfuse, master-espresso and ~15 other apps. This script ONLY adds new host
#    routes via `kamal-proxy deploy <new-service>`. It NEVER reboots/restarts the
#    global proxy. Do NOT run `kamal proxy reboot`.
#
# NOTE: routes pin the container IP at provision time. If canna-stack-mcp/web is
#    redeployed (kamal deploy), containers get NEW IPs — re-run this script with
#    the fresh IPs (look them up below) to re-point.
#
# Usage:  ssh root@62.171.145.76, then run this; or run remotely.
set -uo pipefail

VPS="${VPS:-62.171.145.76}"

run() { ssh -o ConnectTimeout=10 "root@${VPS}" "$@"; }

# Resolve current container IPs (don't hardcode — they change on redeploy).
MCP_IP="$(run 'docker inspect -f "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" canna-stack-mcp-v0211')"
WEB_IP="$(run 'docker inspect -f "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}" canna-stack-web-v0211')"
echo "mcp container IP=${MCP_IP}  web container IP=${WEB_IP}"

# Idempotent: re-running updates the same service in place.
run "docker exec kamal-proxy kamal-proxy deploy canna-mcp-org \
  --target ${MCP_IP}:3001 --host mcp.cannabr.org --tls \
  --health-check-path /health --deploy-timeout 30s"

run "docker exec kamal-proxy kamal-proxy deploy canna-api-org \
  --target ${WEB_IP}:3000 --host api.cannabr.org --tls \
  --health-check-path /health --deploy-timeout 30s"

echo "--- verify ---"
for u in https://mcp.cannabr.org/health https://api.cannabr.org/health \
         https://app.cannabr.org/health https://langfuse.fonsecagabriel.com.br; do
  printf "%-45s " "$u"; curl -sS -o /dev/null -w "%{http_code}\n" --max-time 12 "$u"
done

# DIAGNOSIS (2026-06-16): mcp.cannabr.org/health == 200, but the MCP `initialize`
# POST returns 500 text/plain (empty body, no app log) — and it does so EVEN when
# hitting the container directly (proxy bypassed). So it is NOT a kamal-proxy
# text/event-stream issue (green's hypothesis is refuted): the deployed image
# (localhost:5555/canna-stack:v0.2.1.1, built 2026-06-09) is STALE. The fix
# (commit 56f538a "fix(mcp): live chat-loop — per-request transport ...") is in
# local HEAD but unshipped. Closing the loop requires a FRESH `kamal deploy` of
# canna-stack-mcp (then re-run this script to re-point IPs). Deferred: deploys
# [unverified] WIP + needs DATABASE_URL/JWT_SECRET/etc secrets (location TBD).
