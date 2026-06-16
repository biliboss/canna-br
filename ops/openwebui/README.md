# Open WebUI — canna-oss front-door

Obrigatório sidecar de v0.2.1 (ADR-0002, MCP-first surface). Open WebUI v0.9.6+
fala MCP nativo — host único para Tools L1/L2/L3 via `apps/mcp` stdio sidecar.

Tools L4 (crypto-deletion, role change, recall, SNGPC produção) **não** vivem
aqui. São endpoints REST em `apps/api` com TOTP. **Nunca** expor L4 via MCP.

> **GOTCHA confirmado em smoke 2026-06-08:** `mcp_config.json` neste bundle é
> **template/seed**, NÃO um arquivo carregado automaticamente pelo OWUI v0.9.6.
> OWUI persiste tool servers em DB (`tool_server_connection`). Pós-deploy
> precisa registrar via UI (Settings → Integrações → Servidores de Ferramentas)
> ou seed automático via `POST /api/v1/configs/tool_servers`. Ver
> `Kamal.deploy.notes.md` seção "MCP server registration — RUNTIME".

---

## Quick start

```bash
cd ops/openwebui

# 1. secrets
cp .env.example .env
sed -i "s|replace-with-openssl-rand-base64-32|$(openssl rand -base64 32)|" .env
sed -i "s|replace-with-secrets-token-urlsafe-32|$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')|" .env

# 2. up
docker compose up -d
docker compose logs -f open-webui

# 3. pós-deploy: registrar MCP server (idempotente, safe to re-run)
OWUI_ADMIN_EMAIL=admin@canna.local \
OWUI_ADMIN_PASSWORD=...           \
MCP_SERVER_URL=http://canna-mcp:3001/sse \
  ./scripts/seed-tool-servers.sh
```

OWUI escuta em `127.0.0.1:8080`. TLS termina no Caddy/Traefik (ver
`Caddyfile.example`).

> **Pós-deploy seed** — `scripts/seed-tool-servers.sh` (canonical) registra o
> MCP server `canna-dispensations` via `POST /api/v1/configs/tool_servers`.
> Idempotente, zero third-party deps (Node 20+ fetch only). Roda como Kamal v2
> `post-deploy` hook. Detalhes: `Kamal.deploy.notes.md` seção "Deploy seed
> script". Testes: `pnpm --filter @canna/owui-scripts test`.

---

## First login

`ENABLE_PASSWORD_FORM=False` por default. Para semear o primeiro admin antes do
SSO Authentik:

1. Edite `docker-compose.yml` → `ENABLE_PASSWORD_FORM: "True"`
2. `docker compose up -d open-webui`
3. Acesse `http://localhost:8080` → primeiro usuário criado vira admin
4. Volte `ENABLE_PASSWORD_FORM: "False"` e wire Authentik (seção abaixo)

---

## MCP server registration — verify

Após `docker compose up -d`:

```bash
docker exec canna-owui cat /app/backend/data/mcp_config.json
```

Na UI admin: **Workspace → Tools → External MCP Servers**. Deve listar
`canna-dispensations` com status `connected`. Se `disconnected`:

- `docker exec canna-owui ls /opt/canna-mcp/server.js` — bind mount existe?
- `apps/mcp` foi buildado para `ops/openwebui/canna-mcp/`?
- Logs: `docker compose logs open-webui | grep -i mcp`

---

## Role → OAuth scope mapping

Quando Authentik for wired (v0.2.1.x), claims de grupo viram scopes:

| Authentik group         | OAuth scope            | OWUI role | L1/L2/L3 Tools acessíveis                                   |
| ----------------------- | ---------------------- | --------- | ----------------------------------------------------------- |
| `canna-dispensador`     | `canna:dispensador`    | user      | Dispense kit, registrar dispensa (L1+L2)                    |
| `canna-rt`              | `canna:rt`             | user      | Validar receita, RT-sign batch (L2+L3)                      |
| `canna-dpo`             | `canna:dpo`            | user      | Consent flows, DSAR (L1+L2)                                 |
| `canna-diretoria`       | `canna:diretoria`      | user      | Read-only mart queries, dashboards                          |
| `canna-auditor`         | `canna:auditor`        | user      | Audit log read, evidence pull (L1)                          |
| `canna-federation`      | `canna:federation`     | user      | Cross-org read (mTLS in apps/api gate)                      |

Scopes são checados em `apps/mcp` por tool. OWUI só hospeda — autorização
acontece downstream no MCP server + REST API.

---

## Security checklist (PRE-PROD)

- [ ] `ENABLE_KB_EXEC=False` — Workspace Tools Python OFF (RCE)
- [ ] `ENABLE_PASSWORD_FORM=False` após bootstrap admin
- [ ] `ENABLE_COMMUNITY_SHARING=False` — sem leak de prompts
- [ ] `127.0.0.1:8080` bind — nunca expor porta direta na internet
- [ ] TLS only via Caddy/Traefik, HSTS ativo
- [ ] `WEBUI_SECRET_KEY` gerado per-deploy (não commitado)
- [ ] REST API keys do OWUI rotacionadas a cada 90d (admin UI → Settings → Account)
- [ ] L4 Tools (crypto-deletion etc) **fora** do `mcp_config.json`
- [ ] Postgres password ≥ 32 bytes random
- [ ] Telemetria desligada (LGPD): `ANONYMIZED_TELEMETRY/DO_NOT_TRACK/SCARF_NO_ANALYTICS`
- [ ] OWUI image pinned to `v0.9.6` (sem `latest`)

---

## Backup & restore

### Postgres metadata

```bash
# backup (cron diário)
docker exec canna-owui-postgres pg_dump -U openwebui -d openwebui \
  | gzip > backups/owui-pg-$(date +%F).sql.gz

# restore
gunzip < backups/owui-pg-2026-06-08.sql.gz \
  | docker exec -i canna-owui-postgres psql -U openwebui -d openwebui
```

### WebUI data volume (uploads, RAG store, settings)

```bash
# backup
docker run --rm -v canna-owui-webui-data:/data -v "$PWD/backups:/b" \
  alpine tar czf /b/webui-data-$(date +%F).tgz -C /data .

# restore
docker run --rm -v canna-owui-webui-data:/data -v "$PWD/backups:/b" \
  alpine sh -c 'cd /data && tar xzf /b/webui-data-2026-06-08.tgz'
```

### Redis (effêmero)

Volume `canna-owui-redis-data` é AOF persistido mas sessões são descartáveis.
Não incluir no plano de DR.

---

## Future — Kamal v2 deploy

v0.2.1.x cut: portar este compose pra `config/deploy.yml` Kamal e shippar em
`api.cannabr.org` (VPS 62.171.145.76). Ver `Kamal.deploy.notes.md`
para o plano completo. Reusa pattern do `langfuse-fonsecagabriel`.

---

## References

- ADR-0002 MCP-first surface — `apps/docs/src/content/docs/adr/0002-mcp-first-surface.md`
- Open WebUI MCP docs — https://docs.openwebui.com/features/plugin/mcp
- Open WebUI OAuth — https://docs.openwebui.com/features/sso
- LGPD config baseline — `_memory/feedback-langfuse-fonsecagabriel-skill.md`
