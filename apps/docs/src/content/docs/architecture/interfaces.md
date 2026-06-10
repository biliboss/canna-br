---
title: "Interfaces — MCP-First Surface"
description: "Primary surface = MCP server + MCP Apps em Open WebUI. REST/OpenAPI para sistemas + Nível-4 critical commands. Todas chamam app-services; nenhuma bypassa o domain kernel. NO admin Next.js standalone até pós-v1.0."
---

# Interfaces

> **Tese (canonical, pós-ADR-002):**
>
> - **Primary product surface = MCP server + MCP Apps em Open WebUI.** Telas operacionais nascem dentro do chat host; não há admin Next.js standalone até pós-v1.0.
> - **MCP Apps** (ext-apps spec, jan/2026) são HTML+JS inline no chat — substituem 80+ telas CRUD de ERP tradicional por ~12 components contextuais.
> - **REST/OpenAPI** (`apps/api`) é interface para sistemas e Nível-4 critical commands (TOTP co-presence).
> - **All interfaces call `packages/app-services`. No interface bypasses the domain kernel.**
> - Critical commands (crypto-deletion, role change, SNGPC prod, recall, key rotation) **não são MCP tools** — vivem em `apps/api` REST com TOTP.

Conversation-first, **não** ChatGPT-first. canna-oss aceita comandos vindos de Claude, ChatGPT, Cursor, Open WebUI ou qualquer cliente MCP. Open WebUI é o sidecar default (deployed por padrão); REST permanece acessível para emergência e integrações tradicionais.

## Arquitetura de Camadas

```text
                  Domain Kernel (packages/domain)
                          ↑   pura, zero side effects
                          │
                  App Services (packages/app-services)
                          ↑   loads stream → decide → append → project
                          │
        ┌─────────────────┬─────────────────┬─────────────────┐
        │                 │                 │                 │
   MCP Server         REST/OpenAPI       Worker / Jobs       (no admin
   (apps/mcp)         (apps/api)         (apps/worker)        Next.js —
        │                 │                 │                 ADR-002)
        │                 │                 │
        ▼                 ▼                 ▼
   MCP Apps        Federation,           SNGPC, PDF,
   (packages/      contábil,             Email, BSPO,
    ui-apps)       jurídico,             Reports
        │          Nível-4 (TOTP)
        ▼
   Open WebUI sidecar
   (Claude / ChatGPT /
    Cursor consume same MCP)
```

**Regra invariante:** toda interface chama `packages/app-services`. Nenhuma interface escreve direto no event store, no read model ou em qualquer aggregate. Se você está pensando "para esta interface vou pular o app-service", a arquitetura está errada.

## Conversation-First ≠ ChatGPT-First

| ChatGPT-first | Conversation-first |
|---|---|
| Produto depende do ChatGPT como porta principal | Produto aceita comandos conversacionais vindos de qualquer cliente MCP |
| Falha do ChatGPT = associação parada | Falha de qualquer agente externo = associação opera pela UI |
| Customização presa ao OpenAI | Cliente pode trocar de agente (Claude, ChatGPT, Cursor, agente próprio) sem reescrever produto |

canna-oss é **conversation-first**. ChatGPT (ou Claude, ou Cursor) é **um dos clientes**, não a porta.

## Sem Admin Next.js (ADR-002)

Em revisão de produto de 2026-06-08, Gabriel descartou o admin Next.js standalone. A operação de uma associação de cannabis cabe naturalmente em fluxo conversacional: "Maria pediu 10g do CBD-FS" → agente abre `DispensationFormApp` inline → dispensador confirma → PendingAction → RT aprova no chat → 3 eventos atômicos no event store. Construir esse mesmo fluxo em admin Next.js exige mais código sem entregar mais valor.

**Toda interação humana acontece em uma destas três superfícies:**

1. **MCP Apps inline em Open WebUI** (canal default) — forms, cards, timelines, approval flows renderizados dentro do chat. Cobre dispensação, busca de membro, traceability, pendências, KPIs, BSPO/RIPD review, e tudo o que era admin operacional.
2. **REST/OpenAPI** (`apps/api`) — Nível-4 critical commands com TOTP (crypto-deletion, role change, SNGPC prod submit, recall, key rotation) + integrações tradicionais (federation agents, contábil, jurídico).
3. **Emergency CLI/curl** — `apps/api` REST acessível via curl/Postman caso Open WebUI saia do ar. Operações de emergência (backup, restore, recovery) ficam aqui.

### Por papel (via Open WebUI groups + OAuth scopes → MCP tool filtering)

Cada role vê tools/apps filtrados pelo RBAC do `app-services`. **Não há "tela por papel" como em ERP tradicional** — há **conjunto de tools/apps disponíveis no chat por papel**:

| Papel | MCP scope | Tools/Apps disponíveis |
|---|---|---|
| **Dispensador** | `canna:dispensador` | `get_member_quota`, `list_available_lots`, `draft_dispensation`, `request_record_dispensation` (cria PendingAction) → `MemberQuotaCardApp`, `DispensationFormApp` |
| **Responsável Técnico** | `canna:rt` | + approval tools (`approve_pending_action`, `release_lot`, `quarantine_lot`), `list_sngpc_pending`, BSPO review → adicionalmente `InventoryLotPickerApp`, `BspoReviewApp` |
| **DPO / Encarregado** | `canna:dpo` | LGPD: `list_consent_requests`, `request_crypto_delete_member` (PendingAction Nível-4 → TOTP no `apps/api`), RIPD review → `LgpdRequestsApp`, `RipdReviewApp` |
| **Diretoria** | `canna:diretoria` | Approval Nível-3, dashboards, reports → `KpiDashboardApp`, monthly board report prompts |
| **Auditor** | `canna:auditor` | Read-only Level 1 — `generate_traceability_report`, audit log, event search → `TraceabilityTimelineApp`, `AuditTimelineApp` |
| **Federation** | `canna:federation` | Multi-tenant read-only com tenant switching |

### Critical commands fora do MCP (Nível 4)

Estes **NÃO são tools MCP**. Vivem em `apps/api` REST com TOTP + DPO/Admin co-presence:

- `POST /v1/admin/crypto-delete-member/:id` (LGPD Art. 18 IV)
- `POST /v1/admin/change-user-role`
- `POST /v1/admin/disable-2fa`
- `POST /v1/admin/rotate-site-kek`
- `POST /v1/admin/submit-sngpc-production`
- `POST /v1/admin/change-quota`
- `POST /v1/admin/recall-lot`

MCP App pode **iniciar** o fluxo (criar PendingAction tipo `Nível4Request`), mas a execução final exige TOTP no endpoint REST diretamente. Sem chat-only-autonomy para essas operações.

## MCP Server — Primary Product Surface

[Model Context Protocol](https://modelcontextprotocol.io) é o padrão aberto para conectar aplicações de IA a sistemas externos (descrito como "USB-C para aplicações de IA"). Suporte em Claude, ChatGPT, VS Code, Cursor — build once, integrate everywhere.

A tese comercial:

> Uma associação pode operar o canna-oss pelo agente de IA que já usa — respeitando RBAC, OAuth, auditoria e aprovação humana nas ações críticas.

### Primitivas MCP

O MCP tem três primitivas; cada uma mapeia para um conceito do canna-oss:

| Primitiva MCP | No canna-oss |
|---|---|
| **Resources** (contexto/dados read-only) | Read models projetados — KPIs, quota, lotes, traces |
| **Tools** (funções executáveis) | Commands do app-service, com níveis de risco |
| **Prompts** (workflows guiados) | Playbooks: preparar relatório mensal, investigar discrepância, montar dossier ANVISA |

### Catálogo MCP Proposto

```text
Resources:
  canna://reports/kpi/current
  canna://inventory/available-lots
  canna://members/{id}/quota-summary
  canna://dispensations/{id}/trace
  canna://regulatory-assumptions
  canna://sngpc/pending
  canna://compliance/gaps

Tools:
  search_member
  get_member_quota
  list_available_lots
  draft_dispensation                ← Nível 2: draft, não executa
  request_dispensation_approval     ← Nível 3: pede aprovação humana
  generate_traceability_report
  generate_kpi_report
  list_sngpc_pending
  explain_compliance_gap

Prompts:
  prepare_monthly_board_report
  investigate_inventory_discrepancy
  prepare_anvisa_dossier_section
  review_sngpc_failures
```

## MCP Apps — Telas Contextuais dentro do Agente

[MCP Apps](https://github.com/modelcontextprotocol/ext-apps) é a extensão do MCP que permite o servidor entregar **componentes UI interativos renderizados dentro da conversa do host** (Claude, Open WebUI, ChatGPT). Forms, dashboards, tabelas, gráficos, fluxo de aprovação — inline no chat.

Para canna-oss isso muda o cálculo: várias telas operacionais que seriam construídas no admin tradicional nascem dentro do próprio agente.

### Telas operacionais que migram para MCP Apps

| Tela tradicional | MCP App |
|---|---|
| Dispensação assistida | `DispensationReviewApp` |
| Busca operacional de membro | `MemberQuotaCardApp` |
| Rastreabilidade de lote | `TraceabilityTimelineApp` |
| Dashboard mensal | `KpiDashboardApp` |
| Aprovação de PendingAction | `PendingActionApprovalApp` |
| Picker de lote disponível (FIFO) | `InventoryLotPickerApp` |
| Investigação de discrepância | `InventoryDiscrepancyApp` |
| Resumo SNGPC pendente | `SngpcPendingApp` |

### Pacote compartilhado

```text
packages/ui-apps/
  ├── DispensationReviewApp
  ├── TraceabilityTimelineApp
  ├── KpiDashboardApp
  ├── PendingActionApprovalApp
  ├── InventoryLotPickerApp
  ├── MemberQuotaCardApp
  ├── InventoryDiscrepancyApp
  └── SngpcPendingApp
```

Componentes em formato compatível com MCP Apps, reaproveitáveis também dentro do Minimum Canonical Admin (mesmo código, dois hosts).

### Padrão "MCP App + PendingAction" (escrita)

```text
1. Agente entende intenção do usuário
2. MCP Tool retorna pending_action_id + MCP App renderizado
3. MCP App mostra: diff (estado antes/depois), risco, eventos que serão emitidos
4. Usuário confirma dentro do app (clique do humano, não do LLM)
5. App-service materializa PendingAction
6. Approver autorizado (mesma ou outra pessoa, dependendo de role) aprova
   — via MCP App ou Admin UI
7. Domain emits DispensationRecorded + MemberQuotaConsumed + LotQuantityDeducted
   (single atomic append, cf. ADR-001)
8. Audit log registra approver, host, tool, payload
```

### Host compatibility — pragmatismo

| Host | Status MCP Apps |
|---|---|
| Claude (web/desktop) | Suporte primeiro-class esperado |
| Open WebUI v0.6.31+ | MCP nativo; MCP Apps UI ainda em verificação por feature |
| ChatGPT | Suporte parcial/crescente |
| Cursor / VS Code | Suporte MCP Tools; Apps em evolução |

**Não basear roadmap inteiro em MCP Apps até v0.5+.** v0.3–v0.4 usam MCP Tools + Resources (já estável); MCP Apps entra como aceleração quando hosts amadurecerem.

## Níveis de Risco MCP

Não toda ferramenta vira tool MCP. Cada tool é classificada em 4 níveis:

| Nível | Descrição | Exemplos | Quando habilita |
|---|---|---|---|
| **1 — Read-only** | Consulta sem efeito | `get_inventory_summary`, `get_member_quota_summary`, `list_pending_reports`, `get_traceability_report`, `explain_domain_event` | v0.3 — primeiro round MCP |
| **2 — Draft** | Prepara sem executar; humano confirma | `draft_dispensation`, `draft_kpi_report`, `draft_anvisa_dossier`, `draft_inventory_adjustment` | v0.4 |
| **3 — Escrita operacional** | Cria `PendingAction`; requer RBAC + confirmação na UI | `request_record_dispensation`, `request_release_lot`, `request_submit_report` | v0.5 |
| **4 — Alto risco** | **Não exposto via MCP no v1.0** — exige tela humana, justificativa, dupla aprovação | `execute_crypto_deletion`, `change_user_role`, `disable_2fa`, `delete_or_rotate_keys`, `submit_sngpc_production`, `change_quota`, `recall_lot` | nunca via agente sem UI co-presente |

**Regra:** MCP é **interface de agente**, não backend. Nenhuma tool MCP escreve direto no banco. Nenhuma tool bypassa RBAC. Nenhuma tool chama Drizzle direto para mutação.

## Fluxo de Two-Step Approval (Comandos Críticos)

Para qualquer comando que altere estado regulatório, o fluxo MCP é em duas etapas:

```text
1. Agent calls   request_record_dispensation(member_id, lot_id, quantity_g)
                 → MCP retorna pending_action_id

2. Humano abre   Admin UI → ações pendentes
                 → revisa diff (quota antes/depois, lote antes/depois)
                 → confirma ou rejeita

3. Sistema emite DispensationRecorded + MemberQuotaConsumed + LotQuantityDeducted
                 (mesmo append no event store; cf. ADR-001)
                 → registra approver na payload do evento

4. Agent recebe  notification(action_id, status, event_id)
```

Isso evita a armadilha clássica de deixar o LLM "clicar em produção". Side effects assíncronos (SNGPC XML, PDF, email) seguem cf. boundary sync/async definido em [ADR-001](/adr/0001-domain-kernel-emmett/).

## REST / OpenAPI API — Interface de Sistemas

REST/OpenAPI existe para integrações tradicionais (federação FACT, contábil, jurídico, sistemas externos) **e** para hosts que falam OpenAPI mas ainda não MCP nativo (incluindo Open WebUI Tools).

```text
POST /v1/commands/dispensations
GET  /v1/reports/:id
GET  /v1/inventory/lots
POST /v1/members/import
POST /v1/webhooks/sngpc-callback
```

OpenAPI spec gerada automaticamente (`/openapi.json`) — Open WebUI pode ingerir como tools. Para hosts OpenAPI-only, a bridge [mcpo](https://github.com/open-webui/mcpo) expõe tools MCP como servidor OpenAPI ("MCP-to-OpenAPI proxy"). Resultado: um único conjunto canônico de commands, três pontes (MCP, REST nativo, OpenAPI via mcpo).

Mesma regra: REST handler chama `app-services`, nunca toca event store ou Drizzle direto.

## Open WebUI — Cockpit Agentic Opcional

"canna-oss AI Workbench — powered by Open WebUI". [Open WebUI](https://github.com/open-webui/open-webui) já resolve coisas que **não devemos construir agora**: chat UI, gestão de usuários/grupos por papel, modelos locais (Ollama) + cloud, RAG sobre docs da associação, tools (MCP/OpenAPI/Python), pipelines.

### Como integra

```text
Open WebUI
  ↓ MCP / OpenAPI (mcpo bridge se necessário)
canna-oss interface layer (MCP server + REST/OpenAPI)
  ↓ app-services
Domain Kernel / Emmett
  ↓
Event Store / Read Models
```

- canna-oss expõe MCP Server + OpenAPI Server
- Open WebUI consome esses servers como tools
- Grupos/permissões do Open WebUI mapeiam para roles do canna-oss (via OAuth scopes)
- Modelo (Claude/Sonnet/Llama local) escolhido por tenant ou usuário

### Boundary estrito

| Open WebUI controla | canna-oss controla |
|---|---|
| Chat UI + histórico de conversa | Source of truth regulatório |
| Modelo + temperatura + system prompt | Auth canônica (TOTP no Admin) |
| RAG sobre docs gerais da associação | RBAC + audit + PendingAction |
| Renderização de MCP Apps | Domain Kernel + Event Store |

### Riscos a evitar

- **Não usar Workspace Tools (Python arbitrário)** — execução de código no servidor; doc oficial alerta que operadores comuns não devem ter essa permissão
- **Não tratar Open WebUI como fonte de verdade de usuário/RBAC** — RBAC vive no canna-oss app-services, OAuth é apenas tradutor
- **Não embedar/forkar dentro do produto** — licença Open WebUI exige preservar branding (cf. [README oficial](https://github.com/open-webui/open-webui))
- **Não rodar regra de negócio no Open WebUI** — apenas consumir tools

### Deploy sidecar (compose)

```text
services:
  canna-api:          # Fastify + REST/OpenAPI
  canna-worker:       # BullMQ (SNGPC, PDF, email)
  canna-mcp:          # MCP server (tools + apps)
  canna-openapi-bridge:  # mcpo (apenas se host não fala MCP)
  canna-admin:        # Minimum Canonical Admin (Next.js)
  open-webui:         # opcional, sidecar
  postgres:
  redis:
  minio:
```

## Canna Copilot — Chat Interno (postponed)

Versão integrada do Open WebUI (ou implementação própria) dentro do próprio admin. Usa o mesmo MCP server. Postponed — entra depois que MCP write-with-approval (v0.5) está estável e MCP Apps tem suporte sólido nos hosts. Antes disso é distração.

## Autenticação / Autorização

| Interface | Auth |
|---|---|
| Web Admin UI | TOTP + sessão JWT |
| MCP Server (remoto) | OAuth 2.1 (cf. [MCP Authorization Spec](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization)) — agente age em nome de usuário humano, com escopo limitado |
| REST API | API keys por integração + escopo + IP allowlist por tenant |
| Worker / Jobs | Service account interno, sem exposição externa |

Cada interface tem seu próprio mecanismo. Domínio é único.

### Identity Provider — decisão postponed

A pergunta "quem é o IdP?" (canna-oss próprio, Open WebUI, ou IdP externo como Keycloak/Zitadel/Authentik) **fica em aberto** até v0.5+. Postura faseada:

| Fase | Auth |
|---|---|
| **v0.2** | Admin auth próprio simples — JWT + TOTP. Sem OAuth ainda. |
| **v0.3** | canna-oss emite tokens com escopo para MCP/OpenAPI (próprio IdP simples). Open WebUI usa esses tokens. |
| **v0.5+** | **ADR-002** (futuro) avalia OIDC provider self-hosted se federação/agentes externos crescerem. Não introduzir Keycloak cedo — é um rinoceronte na sala. |

Premissa: identidade vive no canna-oss até existir necessidade real de delegação multi-sistema.

## Roadmap de Interfaces (pós-ADR-002)

| Versão | Interface | Capability |
|---|---|---|
| v0.2.0a/b | Domain kernel + event-store | DONE — Emmett in-mem + Postgres validado, ADR-001 spike gate PASSED. Sem interface ainda. |
| v0.2.1 | **MCP server + MCP Apps + Open WebUI + REST/OpenAPI (sem admin Next.js)** | `apps/mcp` Tools Nível 1+2+3, MCP Apps (`MemberQuotaCardApp`, `TraceabilityTimelineApp`, `DispensationFormApp`), `apps/api` Fastify (commands + Nível-4 REST com TOTP), Open WebUI sidecar OBRIGATÓRIO consumindo MCP nativo, OAuth 2.1 scopes → roles. |
| v0.3 | Pilot expansion | LGPD hardening (crypto-deletion via Tool Nível 3 + TOTP), CSV import, MCP Apps adicionais (`InventoryLotPickerApp`, `MemberSearchApp`, `SngpcPendingApp`, `KpiDashboardApp`), Auditor + Federation read-only roles. |
| v0.4 | Sandbox Dossier Ready | Dossier template via `draft_anvisa_dossier_section`, BSPO trimestral, RIPD via `RipdReviewApp`, DPO view completa (`LgpdRequestsApp`). |
| v0.5 | Regulatory Adapters | SNGPC + SNCR real, retry/DLQ, `SngpcPendingApp`, REST API pública v1 estável. |
| v1.0 | Full backend + Agent marketplace | Cultivation + Processing + Lab + CPC 29 + multi-tenant + billing. Federação multi-associação via 1 agente. Canna Copilot embutido reusando mesmos MCP tools/apps. |

Tools Nível 4 (crypto-deletion, role change, recall, SNGPC prod submit, quota change, key rotation, disable 2FA) **ficam fora do MCP**. Vivem em `apps/api` REST com TOTP + DPO/Admin co-presence — nunca em admin Next.js (que não existe).

## Mensagem Comercial

> "Você opera o canna-oss pelo agente de IA que sua associação já usa — Claude, ChatGPT, Open WebUI, Cursor. Telas operacionais nascem dentro do chat via MCP Apps inline; busca de membro, dispensação, traceability, KPIs, aprovação — tudo no fluxo conversacional. Ações críticas (crypto-deletion, recall de lote, submissão SNGPC produção) exigem TOTP via REST direta, com auditoria event-sourced."

Isso só é verdade se a regra invariante for cumprida em código: **toda interface chama `packages/app-services`; nenhuma interface bypassa o domain kernel; admin Next.js não existe.**

## Referências

- [Model Context Protocol — Specification](https://modelcontextprotocol.io/specification/2025-03-26)
- [MCP Authorization (OAuth 2.1)](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization)
- [MCP Apps — ext-apps](https://github.com/modelcontextprotocol/ext-apps) — UI interativa dentro do chat
- [MCP Apps blog post](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/) — "Bringing UI Capabilities To MCP Clients"
- [Open WebUI](https://github.com/open-webui/open-webui) — cockpit agentic opcional
- [mcpo](https://github.com/open-webui/mcpo) — MCP-to-OpenAPI proxy
- [ADR-001 — Domain Kernel com Emmett](/adr/0001-domain-kernel-emmett/) — sync vs async boundary
- [AGENTS.md](https://github.com/seu-org/canna-oss/blob/main/AGENTS.md) — regras operacionais
