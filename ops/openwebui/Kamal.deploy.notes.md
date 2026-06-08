# Kamal v2 deploy plan — canna OWUI on `canna.fonsecagabriel.com.br`

**Target cut**: v0.2.1.x (após v0.2.1 estabilizar local com docker compose).

Reusa pattern validado em `langfuse-fonsecagabriel` (_memory/feedback-kamal-v2-gotchas.md +
_memory/project-langfuse.md).

## Topology

- **VPS**: 62.171.145.76 (Contabo, compartilhada com Langfuse)
- **DNS**: wildcard `*.fonsecagabriel.com.br` já apontando — sem DNS extra
- **Hostnames**:
  - `canna.fonsecagabriel.com.br` → `apps/api` (REST + GraphQL + L4 TOTP)
  - `webui.canna.fonsecagabriel.com.br` → Open WebUI
  - `mcp.canna.fonsecagabriel.com.br` → `apps/mcp` SSE/HTTP (após cut stdio→HTTP)
- **Proxy**: kamal-proxy (default, port 80/443) — coexiste com Langfuse pelas portas
  pq cada app sobe seu próprio kamal-proxy? **REVISAR**: provavelmente queremos
  Caddy host-level fazendo fan-out, com Kamal `proxy.host` apontando pro upstream
  interno. Langfuse hoje usa essa abordagem.

## Pre-flight checklist

- [ ] `ssh root@62.171.145.76 'free -h'` — confirmar ≥ 4 GiB available
      (Postgres+Redis+OWUI+canna-mcp ≈ 2 GiB steady; Langfuse já come ~3 GiB)
- [ ] Disk: `df -h /var/lib/docker` ≥ 20 GiB free
- [ ] Wildcard cert renovado em Caddy (Langfuse já mantém)
- [ ] Authentik provider `canna-owui` criado + group claims mapeados

## Kamal v2 gotchas (já no _memory)

1. **`env.clear` não expande `$VAR`** — usar `env.secret` ou env literal
2. **`localhost:5555` trick** pra pular login no registry quando self-hosted
3. **`deploy_timeout: 240`** — default 30s é curto pra OWUI cold-start (60s+)
4. **Image sem tag no manifest** — usar `--version` flag no `kamal deploy`
5. **Omit `ports:` em accessories** — Kamal v2 escapa firewall automaticamente
6. **SSH via IP** não hostname (DNS pode atrasar)
7. **URL-encode passwords** em composite URLs (DATABASE_URL)

## Files to ship in v0.2.1.x

```
ops/openwebui/
├── kamal/
│   ├── deploy.yml              # service: canna-owui
│   ├── deploy.production.yml   # overrides VPS-specific
│   └── secrets                 # envless, sourced from 1Password/bw
└── docker-compose.yml          # mantido pra dev local
```

## Migration steps (high-level)

1. Build OCI image: `docker buildx build --platform linux/amd64 -t ghcr.io/mukutu/canna-owui:0.2.1 ops/openwebui` — note: provavelmente vamos reusar `ghcr.io/open-webui/open-webui:v0.9.6` direto + Kamal `accessory` para canna-mcp.
2. `kamal setup` — primeira deploy provisiona Docker, proxy, accessories
3. `kamal deploy --version 0.2.1` — subsequentes
4. `kamal proxy reboot --rolling` se touch no proxy
5. Smoke: `curl -fsS https://webui.canna.fonsecagabriel.com.br/health`
6. SSO: trocar `ENABLE_PASSWORD_FORM=False` + wire Authentik secrets via `kamal secrets push`

## Open questions (parking lot)

- canna-mcp transport: stdio (sidecar bind-mount) ou HTTP/SSE (separate Kamal accessory)? HTTP é mais Kamal-native, mas stdio é o que OWUI v0.9.6 valida primeiro.
- Postgres: shared com Langfuse (separate DB) ou dedicado? Dedicado é mais limpo; Langfuse já tem seu próprio.
- Backups: orquestrar via Kamal hooks `post-deploy` ou cron host externo? Langfuse usa cron host — manter consistência.

## MCP server registration — RUNTIME, não config file (smoke 2026-06-08)

**Finding crítico (sub-agent G smoke):** `mcp_config.json` é convention do **claude-desktop**, NÃO ingestion path do Open WebUI v0.9.6. OWUI armazena tool servers na DB `tool_server_connection` table — registrados via:

1. **Admin UI**: Settings → Integrações → Servidores de Ferramentas → +
2. **API**: `POST /api/v1/configs/tool_servers` com payload `{ TOOL_SERVER_CONNECTIONS: [...] }`

`mcp_config.json` no compose serve apenas como **template/seed** — operador copia o valor pra UI ou roda o POST manualmente.

### Deploy seed script (v0.2.1.x)

Adicionar `ops/openwebui/scripts/seed-mcp-server.sh`:

```bash
#!/bin/sh
# Run once after first admin user is created
ADMIN_TOKEN=$(curl -sf -X POST http://localhost:8080/api/v1/auths/signin \
  -H "content-type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | jq -r .token)

curl -sf -X POST http://localhost:8080/api/v1/configs/tool_servers \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d @./mcp_config.json
```

Run via `kamal hook post-deploy` ou cron one-shot. Documentar `ADMIN_EMAIL`/`ADMIN_PASSWORD` em `secrets`.

### Workaround alternativo

Pre-seed OWUI Postgres directly: `INSERT INTO tool_server_connection (...)` na migration. Menos clean mas funciona em deploys imutáveis.

## OWUI cold start

`start_period: 60s` no healthcheck do compose. Smoke local mediu **44s** entre `docker compose up -d` e `/health → 200`. Margem ok. Em Kamal v2 setar `deploy_timeout: 240` per gotcha #3.
