# canna-br backend — real deploy (docker-direct, tar-pipe)

This is the **reconciled, reproducible** deploy of the TypeScript backend roles
(`api` / `mcp` / `worker` / `projection-worker`) — the way they actually run on
the VPS, not an aspirational Kamal flow.

> `README.md` here = self-host story (`docker compose up`).
> This file = how the **hosted** instance (`*.cannabr.org`) is deployed today.

## Why docker-direct (not `kamal deploy`)

`kamal build push` is **blocked** on the VPS `62.171.145.76` (SSH port-forward to
the local registry is unreliable from this network; GH API DNS is sometimes
poisoned too — see `_memory/feedback-gh-api-dns-poisoned.md`). So the deploy path
is: **tar-pipe the build context → `docker build` ON the VPS → `docker run` each
role → wire `kamal-proxy` host routes**. This mirrors `ops/agent/kamal/deploy-agent.sh`
(the agent uses the identical pattern, validated 2026-06-16).

⚠️ **BLAST-RADIUS GUARD** — the `kamal-proxy` on `62.171.145.76` is SHARED by
blu-omie, langfuse, master-espresso and ~15 other apps. NEVER run
`kamal proxy reboot`. Only `kamal-proxy deploy <service>` to (re)wire a host route.

## The one rule that prevents the crashloop

**ALL roles run via `tsx` — NEVER `node --experimental-strip-types`.** The mcp/
worker/projection-worker sources import siblings with `.js` specifiers that
resolve to `.ts` files on disk. `node --experimental-strip-types` does not rewrite
those specifiers → `ERR_MODULE_NOT_FOUND` → crashloop. `tsx` rewrites them. The
`Dockerfile` default CMD and every `docker-compose.yml` `command:` already use
`tsx`; keep it that way.

## Roles (one image, CMD per role)

| Role                | Entrypoint                              | Port (health) | Notes |
|---------------------|-----------------------------------------|---------------|-------|
| `api`               | `tsx apps/api/src/server.ts`            | 3000          | REST Fastify. `api.cannabr.org`. |
| `mcp`               | `tsx apps/mcp/src/main.ts`              | 3001          | MCP StreamableHTTP. `mcp.cannabr.org`. |
| `worker`            | `tsx apps/worker/src/server.ts`         | 3002          | BullMQ side-effects (SNGPC/PDF/email). No public route. |
| `projection-worker` | `tsx apps/worker/src/projection-worker.ts` | 3002       | Read-model applier. **Not yet a deployed prod role** — opt-in (`--profile projection`); deploy when the observe-side read tables must reflect live writes (see `e2e/register-member.e2e.ts` NOTE). |

All four come from the single `canna-br:0.1.0` image (root `Dockerfile`).
`apps/agent` is built separately (see `README.md` / `ops/agent/`).

## Deploy steps (manual, current reality)

```bash
VPS=62.171.145.76
# 1. tar-pipe the build context to the VPS (exclude heavy regenerated dirs)
tar -czf - --exclude=node_modules --exclude='**/.next' --exclude='**/dist' . \
  | ssh root@$VPS 'mkdir -p /tmp/canna-build && tar -xzf - -C /tmp/canna-build'

# 2. build the single image ON the VPS
ssh root@$VPS 'docker build -t canna-br:0.2.1 /tmp/canna-build && rm -rf /tmp/canna-build'

# 3. run each role on the `kamal` network (so kamal-proxy on 172.18.x can reach it)
ssh root@$VPS 'docker run -d --name canna-stack-mcp --restart=unless-stopped \
  --network kamal -p 127.0.0.1:3001:3001 \
  -e NODE_ENV=production -e DATABASE_URL=... -e PORT=3001 \
  canna-br:0.2.1 tsx apps/mcp/src/main.ts'
# …repeat for api (3000) / worker (3002). projection-worker only when promoting
# the read-side: append `tsx apps/worker/src/projection-worker.ts`.

# 4. wire the host routes on the SHARED proxy (pins container IP — re-run on IP change)
ssh root@$VPS 'docker exec kamal-proxy kamal-proxy deploy canna-mcp-org \
  --target <mcp-kamal-ip>:3001 --host mcp.cannabr.org --tls \
  --health-check-path /health --deploy-timeout 30s'
```

See `ops/openwebui/kamal/add-cannabr-routes.sh` for the route-pinning helper and
`ops/agent/kamal/deploy-agent.sh` for the fully-scripted agent equivalent.

## `ops/agent/kamal/deploy.yml` — what it is / is NOT

That Kamal config describes the **agent** (`app.cannabr.org`, `apps/agent`) only.
It is **not** the backend deploy — and Kamal build-push is blocked anyway, so the
agent ships via `deploy-agent.sh` (docker-direct), not `kamal deploy`. The yml is
kept as reference/intent; the executable truth is the `.sh`.

## Smoke after deploy (the CI/pre-push gate also checks these)

```bash
for u in https://api.cannabr.org/health https://mcp.cannabr.org/health; do
  printf '%-40s ' "$u"; curl -sS -o /dev/null -w '%{http_code}\n' --max-time 12 "$u"
done
# mcp tools/list count + 1 tool invoke: see scripts/validate-mcp-health.mjs
```
