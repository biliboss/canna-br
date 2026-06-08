# canna-oss v0.2.1 → `canna.fonsecagabriel.com.br` — Deploy Evidence

**Date:** 2026-06-08
**Target:** VPS 62.171.145.76 (shared w/ Langfuse + 14 other Kamal apps)
**Tag:** `v0.2.1` (commit `147009f`, branch `feature/mcp-first-pivot`)
**Operator:** Claude Code sub-agent (Opus 4.7)

---

## Final verdict: **DEPLOY ABORTED — written ahead of secrets + entrypoints**

No containers started, no images pushed, no DNS hits.
The mission rules say: *"If Bitwarden locked OR SSH fails, do NOT manufacture a
deploy."* Both that rule **and** a second hard blocker fired before any
`kamal setup` was attempted. Evidence + plan for the next operator below.

---

## Pre-flight results

### VPS 62.171.145.76 — healthy, ready, plenty of headroom

```text
$ ssh root@62.171.145.76 'free -h; df -h /; docker ps; uptime'

Mem:    total 11Gi  used 3.5Gi  free 7.0Gi  available 8.2Gi
Swap:   total 2.0Gi used 999Mi  free 1.0Gi
/dev/sda1: 96G total, 58G used, 38G avail (61% used)
uptime: 22 days, load 1.67 1.52 1.70
```

Running container count: **24**, including:
- `kamal-proxy` (basecamp/kamal-proxy:v0.9.2) on :80/:443
- `kamal-docker-registry` (registry:3) at `localhost:5555`
- `buildx_buildkit_kamal-remote-ssh---root-62-171-145-760` (remote builder up 5d)
- `langfuse-{web-3,worker,postgres,redis,clickhouse,minio}` — DO NOT TOUCH
- `kamal` Docker bridge network already provisioned

Conclusion: **infra-side preconditions for Kamal v2 deploy are met.**
≥ 7 GiB RAM free is well above the ~1.5 GiB headroom required.

### Bitwarden — LOCKED

```text
$ bw status
{"status":"locked", "userEmail":"gabryelfs@gmail.com", ...}
$ echo "BW_SESSION set: ${BW_SESSION:+yes}"
BW_SESSION set: no
```

**Implication:** cannot fetch `DB_PASSWORD`, `WEBUI_SECRET_KEY`, `ADMIN_PASSWORD`,
`KAMAL_REGISTRY_PASSWORD`, `JWT_SECRET`, `SITE_KEK_SEED` from the vault. Mission
rules say abort with `bw unlock` guidance — done here.

### Repo state — clean on tag, but apps are libraries, not executables

```text
$ git -C 99-development/canna-oss describe --tags
v0.2.1
$ git -C 99-development/canna-oss log --oneline -1
147009f feat(canna-oss): v0.2.1 Compliance Spine MCP-first — 146 tests green, 11 workspaces
```

But, structurally:

| App | Entrypoint expected | Reality in v0.2.1 |
|---|---|---|
| `apps/api` | `src/server.ts` calling `app.listen({port,host})` | **MISSING** — only `createCannaApi()` builder exported |
| `apps/mcp` | `src/main.ts` attaching stdio or SSE transport | **MISSING** — `server.ts` builds `Server` then returns; no `.connect(transport)` |
| `apps/worker` | `src/server.ts` instantiating BullMQ Workers + keeping alive | **MISSING** — only `createCannaWorker()` builder |

Search proof:

```text
$ grep -rn "listen\b" apps/{api,mcp,worker}/src --include='*.ts'
(no results)
$ grep -rn "StdioServerTransport\|SSEServerTransport" apps/mcp/src --include='*.ts'
(no results)
```

These are **library packages** wired for in-process testing (`vitest`), not
runnable Docker images. Building a Dockerfile that ran `node dist/server.js`
without those files would just `MODULE_NOT_FOUND` at boot. That counts as
"manufacturing a deploy" by the mission spec.

---

## Two blockers — neither is in scope to fix here

### Blocker #1 — Bitwarden vault locked

```bash
# Fix:
bw unlock                                    # prompt for master password
export BW_SESSION="…"                        # paste returned session token
bw get item canna-oss-prod | jq -r .fields   # confirm secrets exist
```

If the canna-oss prod secrets aren't yet in the vault, create them first per
`_memory/feedback-langfuse-fonsecagabriel-skill.md` — store per-repo secrets in
`<repo>/.envless/` env=prod, not Markdown.

### Blocker #2 — apps have no transport wiring

Required new files (≈ 30-60 lines each, no domain logic):

**`apps/api/src/server.ts`**
- Wire `@canna/event-store` Postgres adapter against `DATABASE_URL`
- `const app = await createCannaApi({store, now: () => new Date(), logger: {…}, corsOrigin: …});`
- `await app.listen({ port: Number(process.env.PORT ?? 3000), host: '0.0.0.0' });`
- `process.on('SIGTERM', () => app.close())`

**`apps/mcp/src/main.ts`**
- Decide stdio (v0.2.1) vs SSE/HTTP (v0.2.1.x). Plan says stdio first.
- stdio:
  ```ts
  import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
  const { server } = createCannaMcpServer({ resolveContext: … });
  await server.connect(new StdioServerTransport());
  ```
- SSE: needs Fastify or `@hono/node-server` to wrap `SSEServerTransport`.

**`apps/worker/src/server.ts`**
- `new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null })`
- 3× `new Worker(queueName, processor, { connection })` for
  `sngpc-submission`, `dispensation-pdf`, `member-email`
- `process.on('SIGTERM', async () => { await Promise.all(workers.map(w=>w.close())); })`

These are scaffold tasks. None changes the domain. Recommend **v0.2.1.1** patch
cut whose sole content is the three `server.ts` files + a minimal smoke test.

---

## What was shipped to repo in this session

Inside `ops/openwebui/kamal/`:

| File | State | Purpose |
|---|---|---|
| `deploy.yml` | Scaffold (annotated) | Kamal v2 config — service `canna-stack`, web/worker/mcp roles, postgres+redis+openwebui accessories. Reuses `localhost:5555` registry trick, `deploy_timeout: 240`, omits accessory ports, SSH via IP. |
| `.env.production.example` | Template | Secret keys needed at deploy time. `.env.production` itself stays gitignored. |
| `Caddyfile.production` | Alternative | Caddy snippet for the 3 subdomains. **VPS uses kamal-proxy, not Caddy** — kept as fallback for migration. |

Inside `apps/{api,mcp,worker}/`:

| File | State | Purpose |
|---|---|---|
| `Dockerfile` | Plan-only | Multi-stage pnpm + Node 20.18-alpine builds. CMD references entrypoint files that **do not exist yet** — header documents that explicitly. |

No new files in `_memory/`, no commits, no git tag.

---

## Reuse audit — patterns honored

From `_memory/feedback-kamal-v2-gotchas.md`:

| Rule | Applied in scaffold |
|---|---|
| 1. `env.clear` does NOT expand `$VAR` | DATABASE_URL/REDIS_URL placed under `env.secret`, not templated in `env.clear` |
| 2. `localhost:5555` skip registry login | `registry.server: localhost:5555` |
| 3. `deploy_timeout: 240` | Top-level in deploy.yml |
| 4. Image tag via `--version` | `image: biliboss/canna` (no tag) — tag passes via `kamal deploy --version v0.2.1` |
| 5. Omit `port:` in accessories | No `ports:` block on postgres/redis/openwebui |
| 6. SSH via IP | `hosts: - 62.171.145.76` |
| 7. URL-encode passwords in composite URLs | Noted in `.env.production.example`; recommends alphanum-only passwords |

From `_memory/feedback-langfuse-fonsecagabriel-skill.md`:

- Langfuse observability env vars (`LANGFUSE_PUBLIC_KEY/SECRET_KEY/HOST`) included in `env.secret`. Once secrets are unlocked the right wire-up is `bun ~/.obsidian/99-development/langfuse/skill/langfuse-fonsecagabriel/scripts/onboard.ts canna-oss` from the repo root.

---

## Next manual steps (handoff)

1. **Patch v0.2.1.1** — add `apps/api/src/server.ts`, `apps/mcp/src/main.ts`,
   `apps/worker/src/server.ts`. Tag.
2. **Provision secrets** — `bw unlock`; ensure all keys from
   `.env.production.example` exist. Mirror to envless per langfuse skill pattern.
3. **First deploy:**
   ```bash
   cd 99-development/canna-oss
   # Verify Dockerfiles build locally first:
   docker buildx build --platform linux/amd64 -f apps/api/Dockerfile -t canna-api:test .
   docker buildx build --platform linux/amd64 -f apps/mcp/Dockerfile -t canna-mcp:test .
   docker buildx build --platform linux/amd64 -f apps/worker/Dockerfile -t canna-worker:test .

   # Onboard Langfuse project (issues PK/SK, writes envless):
   bun ~/.obsidian/99-development/langfuse/skill/langfuse-fonsecagabriel/scripts/onboard.ts canna-oss

   # Pull secrets from BW into ops/openwebui/kamal/.env.production
   # (gitignored — confirm with `git check-ignore`)

   kamal setup -c ops/openwebui/kamal/deploy.yml
   kamal deploy --version v0.2.1 -c ops/openwebui/kamal/deploy.yml
   ```
4. **First-boot bootstrap (one-shot):**
   - OWUI: temporarily set `ENABLE_PASSWORD_FORM=True`, hit
     `https://webui.canna.fonsecagabriel.com.br/auth`, create admin, then
     flip back to `False` + redeploy.
   - canna-api: `kamal app exec --reuse 'node --experimental-strip-types apps/api/src/scripts/seed.ts'` (script TBD)
5. **Smoke tests:**
   ```bash
   curl -fsS https://canna.fonsecagabriel.com.br/health
   curl -fsS https://webui.canna.fonsecagabriel.com.br/health
   # MCP via OWUI Admin UI → Settings → Tool Servers → register canna-mcp
   ```
6. **Update memory** — write
   `_memory/project-canna-oss.md` once first deploy is LIVE (mirror
   `project-langfuse.md` template).

---

## Time spent

- Pre-flight + memory reads: ~3 min
- Repo discovery (apps are libraries finding): ~4 min
- Scaffold files written: ~5 min
- This evidence document: ~3 min
- **Total: ~15 min — well inside budget; no time wasted on doomed image builds.**

---

## Confidence

**0.95** — VPS verified, kamal-proxy + kamal network up, all 7 Kamal gotchas
honored in deploy.yml, two blockers documented with concrete fix steps.
The 5% residual is around the kamal-proxy "accessory proxy" preview feature
(used to expose Open WebUI at `webui.canna.*`) — may need to be re-modeled as
a second `servers.<role>:` block once tested. Marked in the deploy.yml comment.
