---
title: "ADR-002 — MCP-First Surface (Open WebUI + MCP Server + MCP Apps)"
description: "Surface pivot: primary product UI = MCP server + MCP Apps inside Open WebUI chat. NO standalone admin Next.js until post-v1.0."
---

# ADR-002 — MCP-First Surface

| Campo | Valor |
|---|---|
| Status | **Accepted + Smoke Validated (2026-06-08)** (Gabriel pivot 2026-06-08) |
| Data | 2026-06-08 |
| Versão | v0.2.1+ |
| Substitui | Parcialmente [ADR-001](/adr/0001-domain-kernel-emmett/) na **camada de interface**. Camada de domínio + event-sourcing inalterada. |
| Substituído por | — |
| Premissas | Manager premise #26 (hard_rule), #27 (stack), #28 (stack) |

## Contexto

ADR-001 estabeleceu Domain Kernel + Emmett + Minimum Canonical Admin (Next.js) + MCP server como interfaces complementares. A intenção era: admin Next.js = canonical, MCP = porta agentic complementar.

Durante revisão de produto (2026-06-08), Gabriel re-priorizou:

1. **Operação real esperada vive no chat.** Associação de cannabis tem operação rotineira de dispensação que cabe muito bem em fluxo conversacional: "Maria pediu 10g do CBD-FS-200" → agente abre form com membro pré-selecionado, lote FIFO, quantidade → dispensador confirma → PendingAction → RT aprova no chat → 3 eventos atômicos. Construir esse mesmo fluxo em admin Next.js exige mais código sem entregar mais valor.

2. **MCP Apps spec final (janeiro 2026)** torna o caminho viável. ext-apps spec (SEP-1865) suporta UI HTML interativa renderizada inline em hosts compatíveis (Claude.ai web/desktop, ChatGPT, VS Code, Cursor, Open WebUI v0.6.31+). Forms, dashboards, timelines, approval flows nascem dentro da conversa.

3. **Open WebUI v0.9.6+ tem suporte MCP nativo + OAuth 2.1.** Self-host docker-compose pronto em uma sentada (~15min). Resolve chat UI + RAG + multi-modelo + auth gratuitamente. Não precisa construir.

4. **Recursos de engenharia são finitos.** Time pequeno. Cada hora gasta em Next.js admin é uma hora não gasta em MCP server + tools + apps. Como o objetivo de v0.2.1 é **operação real piloto**, o caminho MCP-first ship faster.

5. **Admin Next.js como fallback "para o caso de"** é trabalho especulativo. Se aparecer associação que não consegue operar via chat (hipótese ainda não validada), avaliar PWA leve naquele momento. Não pré-construir.

## Decisão

Para v0.2.1 até v1.0, **o canna-oss não terá admin Next.js standalone**. Toda interação humana com o sistema acontece através de:

1. **MCP server TypeScript** (`apps/mcp`) — expõe Tools (Nível 1 read, 2 draft, 3 write-with-approval), Resources, Prompts, e MCP Apps via [`@modelcontextprotocol/ext-apps`](https://github.com/modelcontextprotocol/ext-apps).

2. **MCP Apps inline** (`packages/ui-apps`) — components HTML interativos renderizados dentro do chat host:
   - `MemberQuotaCardApp` (read-only card + recent dispensations)
   - `TraceabilityTimelineApp` (plant → harvest → lot → dispensation chain)
   - `DispensationFormApp` (form + member picker + lot picker FIFO + quantity → Tool Nível 3)
   - `PendingActionApprovalApp` (diff + risk + approve/reject)
   - `InventoryLotPickerApp`, `MemberSearchApp`, `SngpcPendingApp`, `BackupStatusApp` (v0.3)
   - `KpiDashboardApp`, `BspoReviewApp`, `RipdReviewApp`, `LgpdRequestsApp` (v0.4)
   - `CultivationOverviewApp`, `LabResultsApp`, `FinanceDashboardApp` (v1.0)

3. **Open WebUI sidecar** (docker-compose, `ghcr.io/open-webui/open-webui:v0.9.6`) — primary product surface para associação. Self-hosted. Registers `apps/mcp` via config file. OAuth 2.1 com scopes mapped para canna roles (DISPENSADOR/RT/DPO/Diretoria/Auditor/Federação).

4. **REST/OpenAPI** (`apps/api` Fastify) — system interface para integrações tradicionais (federation agents, contábil, jurídico). Open WebUI consome via MCP, não via OpenAPI direto. `mcpo` bridge disponível para hosts OpenAPI-only mas não obrigatório.

### O que NÃO está incluído

- **Admin Next.js standalone** — fora do roadmap v0.2.1–v1.0. Move para Ideas Park.
- **Apps mobile native** — fora de escopo (PWA via Open WebUI mobile é alternativa).
- **Workspace Tools (Python execution) no Open WebUI** — desabilitado em produção. Toda lógica vive em `apps/mcp`, não em scripts Python ad-hoc.

### Critical commands continuam fora do MCP

Per ADR-001 sync/async boundary + nível-4 risk tools:

- `execute_crypto_deletion` (LGPD Art. 18 IV)
- `change_user_role`, `disable_2fa`, `delete_or_rotate_keys`
- `submit_sngpc_production`
- `change_quota`, `recall_lot`

Essas **não são MCP tools**. São operações no `apps/api` que exigem TOTP + DPO/Admin co-presença. Se v0.3+ produzir um `LgpdRequestsApp`, esse app **inicia** o fluxo (cria PendingAction) mas a execução final passa por confirmação fora do agente.

## Boundary atualizado

| Camada | Quem controla | Camadas dependentes |
|---|---|---|
| Domain (`@canna/domain`) | TypeScript puro — sem deps externas | — |
| Event Store (`@canna/event-store`) | Emmett 0.42.3 (in-memory + Postgres) | `@canna/domain` |
| App Services (`@canna/app-services`) | Orchestration load → decide → append | `@canna/domain`, `@canna/event-store` |
| Read Models (`@canna/read-models`) | Drizzle projections | `@canna/app-services` events stream |
| MCP Server (`apps/mcp`) | `@modelcontextprotocol/sdk` + ext-apps; **só chama app-services** | `@canna/app-services`, `@canna/read-models` |
| MCP Apps (`packages/ui-apps`) | ext-apps spec; HTML+CSS+JS inline; comunica via `app.callServerTool` | `apps/mcp` tool catalog |
| REST API (`apps/api`) | Fastify thin; **só chama app-services** | `@canna/app-services` |
| Workers (`apps/worker`) | BullMQ async (SNGPC, PDF, email) | `@canna/app-services`, `@canna/read-models` |
| Open WebUI | sidecar, self-host, consume MCP via config | `apps/mcp` |

**Mental rule:** if you find yourself sketching a Next.js admin page, stop. Render as MCP App inline in chat. If the workflow doesn't fit chat conversation, that's signal that the workflow needs redesign or that it belongs to the Nível-4 set (which lives at REST `apps/api` + TOTP).

## Consequências

### Positivas

- **Ship faster**: ~3-4 weeks of Next.js admin work cancelled. Same engineering hours go into MCP tools + apps that work in any compatible host.
- **Agent-native default**: associação opera com o agente que já usa (Claude/ChatGPT/Open WebUI/Cursor). "Build once, integrate everywhere" via MCP spec.
- **Less UI code**: ~70 telas tradicionais de ERP viram ~12 MCP Apps. Mesma cobertura operacional, menos surface area.
- **Open WebUI free**: chat UI + groups/users + RAG + multi-model — todos resolvidos pelo sidecar. Foco do time fica no domínio.
- **MCP App reusability**: cada `*App` componente renderiza em Claude, ChatGPT, Open WebUI, futuro Canna Copilot embedded. Um codebase, N hosts.

### Negativas

- **Depende de host compatibility**: Open WebUI v0.9.6+ tem MCP nativo + parcial MCP Apps (UI custom). Outros hosts (Claude.ai, ChatGPT) suportam full MCP Apps. Hosts antigos ou agente fora do ecossistema = sem fallback se a associação não usa nenhum. Mitigação: REST/OpenAPI para integrações; Open WebUI é o sidecar default obrigatório no compose.
- **Sem fallback "admin standard"**: se Open WebUI sair do ar, operação para. Mitigação: deploy redundante; emergency tool `apps/api` REST acessível via curl/Postman para Nível-4 critical commands.
- **License consideration**: Open WebUI AGPL-3.0 + Commons Clause em enterprise. Não pode ser white-labeled como "canna-oss Admin"; usa como `ghcr.io/open-webui/open-webui` com branding visível. Aceito.
- **MCP Apps spec é jovem (jan 2026)**: hosts ainda implementando. Mitigação: começar com Tools (Nível 1 read) que funcionam em 100% dos hosts; gradualmente adicionar Apps conforme amadurecer.
- **Multi-tenant isolation**: Open WebUI v0.9.6 é single-tenant. Multi-tenant managed hosting v1.0+ exigirá schema isolation + 1 docker-compose per tenant ou Authentik front. Documentado em [Interfaces](/architecture/interfaces/) como decisão diferida.

## Riscos a evitar

- **Não fazer Workspace Tools (Python execution) no Open WebUI** acessíveis a operadores. Doc oficial alerta = RCE vector. Desabilitar (`ENABLE_KB_EXEC=false`) em produção.
- **Não embedar/forkar Open WebUI** dentro do produto. Preservar branding via deploy sidecar.
- **Não rodar regra de negócio no Open WebUI**. Toda lógica em `apps/mcp` chamando `@canna/app-services`. Open WebUI = chat UI + tool invocation only.
- **Não construir MCP Apps que pulem RBAC**. Cada tool em `apps/mcp` valida OAuth scope antes de chamar app-service. PendingAction obrigatório para Tools Nível 3.

## Spike validations executadas

Antes de promover esta ADR para Accepted, validamos:

- ✅ Emmett 0.42.3 Postgres adapter funciona com testcontainers (6/6 specs PG verdes; ADR-001 spike gate cumprido)
- ✅ Cross-aggregate dispensation use case atomic 3-event append (50 vitest domain + 6 e2e app-services scenarios)
- ✅ Open WebUI v0.9.6 docker-compose pattern + MCP server registration researched (Agent B report)
- ✅ MCP Apps ext-apps spec + TypeScript SDK status confirmed (Agent C report) — Claude/ChatGPT/Cursor/VS Code full support; Open WebUI partial; ChatGPT launched Jan 2026

## Próximos passos (v0.2.1 implementation)

1. `apps/api` Fastify thin endpoints (commands proxy)
2. `@canna/read-models` Drizzle projections (member-quota, inventory-summary, dispensation-history)
3. `apps/mcp` MCP server scaffold (`@modelcontextprotocol/sdk`)
4. MCP Tools Nível 1 (read) — 6 tools
5. MCP Tools Nível 2 (draft) — 3 tools
6. MCP Tools Nível 3 (write w/ approval) — 3 tools + PendingAction infra
7. `packages/ui-apps` — 3 MCP Apps básicos (`MemberQuotaCardApp`, `TraceabilityTimelineApp`, `DispensationFormApp`)
8. Open WebUI sidecar docker-compose + MCP config wiring
9. OAuth 2.1 + scope-to-role mapping
10. Pilot deploy em 1 associação

## Smoke Validation 2026-06-08

Sub-agent G executou smoke end-to-end no commit `147009f` (tag `v0.2.1`, branch `feature/mcp-first-pivot`). Verdict: **PARTIAL PASS** — stack boota verde, bundles renderizam, OWUI tool-server registration exige seed script (Lane I em flight).

### Stack boot

- `docker compose up -d` em `ops/openwebui/` → 3 containers (OWUI v0.9.6 + Postgres 16 + Redis 7) healthy.
- Cold start: ~44s (image pull cached). RAM steady ~3 GB combinado.
- OWUI responde em `127.0.0.1:8080` (admin form login `ENABLE_PASSWORD_FORM=true` em smoke override).

### Bundle render

Os 3 MCP Apps prontos buildam para single-file HTML com inlining estático (script + style inline) via `packages/ui-apps` Vite SSG step. Servidos por um HTTP server local na porta 8081 durante smoke, todos retornam 200 e renderizam:

- `MemberQuotaCardApp` ([manifest](https://github.com/canna-oss/canna-oss/blob/main/packages/ui-apps/src/member-quota-card/index.ts)) — empty state + populated state OK
- `TraceabilityTimelineApp` ([manifest](https://github.com/canna-oss/canna-oss/blob/main/packages/ui-apps/src/traceability-timeline/index.ts)) — timeline renderiza com phases ordenadas
- `DispensationFormApp` ([manifest](https://github.com/canna-oss/canna-oss/blob/main/packages/ui-apps/src/dispensation-form/index.ts)) — form submit dispara postMessage `ui/tools/call`

### OWUI MCP registration reality

GOTCHA descoberto no smoke: `ops/openwebui/mcp_config.json` é **template/seed**, NÃO arquivo carregado pelo OWUI v0.9.6 no boot. OWUI persiste tool servers no Postgres na tabela `tool_server_connection`. Registro acontece em runtime via duas vias:

- **Admin UI:** Settings → Integrações → Servidores de Ferramentas → + (manual, 1× por servidor)
- **API:** `POST /api/v1/configs/tool_servers` com bearer token de admin (idempotente; seed script em `ops/openwebui/scripts/seed-tool-servers.ts` — Lane I)

Docs operacionais atualizados: [`ops/openwebui/README.md`](https://github.com/canna-oss/canna-oss/blob/main/ops/openwebui/README.md) + [`ops/openwebui/Kamal.deploy.notes.md`](https://github.com/canna-oss/canna-oss/blob/main/ops/openwebui/Kamal.deploy.notes.md) seção "MCP server registration — RUNTIME".

### postMessage canonical contract

Host (OWUI / Claude.ai / ChatGPT) ↔ App (iframe) usa `window.postMessage` bidirecional. Schema canônico baseado em ext-apps spec:

```ts
// Host → App (push de payload inicial / refresh)
window.postMessage({
  type: "ui/notifications/tool-result",
  params: { content: [{ text: JSON.stringify(canonicalPayload) }] }
}, "*")

// App → Host (Tool L2/L3 invocation a partir de form submit, etc.)
window.parent.postMessage({
  type: "ui/tools/call",
  params: { name: "request_record_dispensation", arguments: {...} }
}, "*")
```

App-side handlers (em `main.ts` de cada bundle) ouvem `message` events e fazem `JSON.parse(content[0].text)` defensivo — tolerância a payload já-objeto ou string (patch landed pós-smoke em `member-quota-card/main.ts`).

### Canonical payload shapes

Cada App declara seu schema esperado no manifest `index.ts`. Resumo:

- **MemberQuotaCardApp** (read-only) — espera:
  ```ts
  {
    memberId: string,
    status: "active" | "suspended" | "pending",
    consumedG: number,
    prescription: { monthlyQuotaG: number },
    recent: Array<{ date: string, quantityG: number, lotId: string }>
  }
  ```
- **TraceabilityTimelineApp** (read-only) — espera:
  ```ts
  {
    dispensationId: string,
    timeline: Array<{ phase: string, date: string, data: Record<string, unknown> }>
  }
  ```
- **DispensationFormApp** — não recebe payload inicial (form em branco); emite Tool call `request_record_dispensation` no submit com `{ memberId, lotId, quantityG, dispensedAt }`.

### Evidence

9 screenshots em [`ops/openwebui/smoke/`](https://github.com/canna-oss/canna-oss/tree/main/ops/openwebui/smoke):

| # | Frame | Estado |
|---|---|---|
| 01 | OWUI landing | sign-in pré-login |
| 02 | Logged in + MCP servers list | conta admin criada |
| 03 | Admin → Integrações | menu correto |
| 04 | Tool Servers empty | confirma seed pendente |
| 05 | MemberQuotaCardApp empty | bundle carrega antes do payload |
| 06 | MemberQuotaCardApp rendered | postMessage payload aplicado |
| 07 | DispensationFormApp | inputs + submit handler |
| 08 | TraceabilityTimelineApp | timeline phases ordenadas |
| 09 | Smoke summary | run sintético |

### Verdict

**PARTIAL PASS.** Stack boota verde. Bundles renderizam com postMessage contract. OWUI tool-server registration depende de seed script (Lane I em flight). Próximo gate: seed automático + Kamal deploy `canna.fonsecagabriel.com.br` (Lane H).

Patches landed pós-smoke:

1. `ops/openwebui/canna-mcp/.gitkeep` — garante mount path do compose
2. `packages/ui-apps/src/member-quota-card/main.ts` — tolerância postMessage (string|object)
3. `ops/openwebui/README.md` + `Kamal.deploy.notes.md` — clarifica que `mcp_config.json` é seed, não auto-load

## Referências

- [MCP Apps ext-apps spec](https://github.com/modelcontextprotocol/ext-apps)
- [MCP Apps blog post (Jan 2026)](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/)
- [Open WebUI v0.9.6+](https://github.com/open-webui/open-webui)
- [mcpo bridge](https://github.com/open-webui/mcpo)
- [ADR-001 — Domain Kernel + Emmett](/adr/0001-domain-kernel-emmett/)
- [Interfaces — UI · MCP · REST](/architecture/interfaces/)
- [Roadmap v0.2.1+](/roadmap/)
- Manager premises: #26 (hard_rule MCP-first surface), #27 (stack MCP Apps substitui admin), #28 (stack Open WebUI self-host)
