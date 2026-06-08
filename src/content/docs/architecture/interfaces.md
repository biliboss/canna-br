---
title: "Interfaces — Human, Agent, System"
description: "UI canônica + MCP para agentes + REST para sistemas. Todas chamam app-services; nenhuma bypassa o domain kernel. Critical commands exigem aprovação humana."
---

# Interfaces

> **Tese (canonical):**
>
> - The **canonical admin is minimal and regulatory** — Auth, RBAC, audit, configuration, approval, emergency, signed reports.
> - The **agent interface is rich and contextual** — operational screens via MCP Apps, conversational via MCP Tools, opcionalmente hospedada em Open WebUI.
> - **MCP Apps provide operational screens inside AI hosts**, but **all critical actions still flow through app-services, RBAC, PendingAction and event-sourced audit**.
> - REST/OpenAPI is system interface for traditional integrations (and via [mcpo](https://github.com/open-webui/mcpo) bridge for OpenAPI-only hosts).
> - **All interfaces call `packages/app-services`. No interface bypasses the domain kernel.**

Conversation-first, **não** ChatGPT-first. O canna-oss aceita comandos vindos de Claude, ChatGPT, Cursor, WhatsApp, agente interno ou outro cliente MCP — mas a associação precisa operar mesmo se todos os agentes externos pararem de funcionar simultaneamente.

## Arquitetura de Camadas

```text
                  Domain Kernel (packages/domain)
                          ↑   pura, zero side effects
                          │
                  App Services (packages/app-services)
                          ↑   loads stream → decide → append → project
                          │
        ┌─────────────────┼─────────────────┬─────────────────┐
        │                 │                 │                 │
   Web Admin UI      MCP Server         REST API         Worker / Jobs
   (canônica)       (agentes)         (sistemas)       (BullMQ async)
        │                 │                 │                 │
     Diretoria        Claude            Sistemas          SNGPC, PDF,
     RT, DPO,         ChatGPT           externos          Email,
     Dispensador      Cursor            (federação,       BSPO,
     Auditor          Federation        contábil,         Reports
                      agent             auditor)
```

**Regra invariante:** toda interface chama `packages/app-services`. Nenhuma interface escreve direto no event store, no read model ou em qualquer aggregate. Se você está pensando "para esta interface vou pular o app-service", a arquitetura está errada.

## Conversation-First ≠ ChatGPT-First

| ChatGPT-first | Conversation-first |
|---|---|
| Produto depende do ChatGPT como porta principal | Produto aceita comandos conversacionais vindos de qualquer cliente MCP |
| Falha do ChatGPT = associação parada | Falha de qualquer agente externo = associação opera pela UI |
| Customização presa ao OpenAI | Cliente pode trocar de agente (Claude, ChatGPT, Cursor, agente próprio) sem reescrever produto |

canna-oss é **conversation-first**. ChatGPT (ou Claude, ou Cursor) é **um dos clientes**, não a porta.

## Minimum Canonical Admin — Obrigatório

A UI administrativa é a interface canônica **mínima**. Em domínio regulado, não há como fugir disso: diretoria, RT, DPO e auditor precisam de tela explícita que **sempre existe, sempre funciona e é nossa** — sem dependência de host MCP externo.

Mas com MCP Apps (ver abaixo), o admin não precisa virar um ERPzão de 80 telas CRUD. Ele fica **mínimo e regulatório**; telas operacionais migram para MCP Apps.

### O que SEMPRE fica no admin

| Tela | Por quê |
|---|---|
| Login / 2FA / TOTP | Auth é first-class, sem dependência de host externo |
| Usuários / papéis (RBAC) | Identidade é controle regulatório |
| Configuração de tenant | Decisão estrutural, exige tela explícita |
| Audit log oficial | Roda mesmo se agente externo falhar |
| Pending Actions (aprovação) | Pode também aparecer no MCP App, mas sempre disponível aqui |
| Relatórios assinados oficialmente | Carimbo cripto + responsável técnico |
| Crypto-deletion (Art. 18 IV) | Nunca via agente — UI co-presente obrigatória |
| Backup / restore | Operação de emergência |
| Tela de emergência / fallback manual | Funciona se TUDO o mais cair |

### Views por papel (minimalistas)

| Papel | O que a UI mostra |
|---|---|
| **Diretoria** | Dashboard, KPIs, relatórios, riscos, pendências de aprovação |
| **Responsável Técnico** | Prescrições, lotes, COA, liberação de lote, SNGPC pendente, BSPO |
| **Dispensador** | Buscar membro, ver quota, ver lote disponível, registrar dispensação, emitir comprovante |
| **DPO / Encarregado** | Consentimentos, solicitações LGPD, crypto-deletion, audit log, RIPD |
| **Auditor** | Read-only — rastreabilidade, event log, relatórios exportáveis |

Cada papel é uma view sobre o mesmo domínio. RBAC do `app-services` filtra o que cada papel pode ver/fazer.

## MCP Server — Interface Agentic

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

## Roadmap de Interfaces

| Versão | Interface | Capability |
|---|---|---|
| v0.2 | Minimum Canonical Admin + REST interno | Login/TOTP, RBAC, Audit log, Pending Actions, Diretoria + RT + Dispensador. Sem MCP ainda. |
| v0.3 | Admin completo + MCP read-only + OpenAPI | DPO + Auditor views. Resources + Tools Nível 1 expostos via MCP. OpenAPI público para integradores. Open WebUI sidecar opcional consumindo via MCP/OpenAPI. |
| v0.4 | MCP draft actions + MCP Apps básico | Tools Nível 2 (`draft_*`). Primeiros MCP Apps: `MemberQuotaCardApp`, `TraceabilityTimelineApp`, `KpiDashboardApp`. mcpo bridge para hosts OpenAPI-only. |
| v0.5 | MCP write with approval + MCP Apps completos | Tools Nível 3 (`request_*`) com PendingAction + two-step approval. MCP Apps: `DispensationReviewApp`, `PendingActionApprovalApp`, `InventoryLotPickerApp`. REST/OpenAPI público estável (v1). |
| v1.0 | Agent marketplace + federation + Canna Copilot embutido | Federação conecta agente próprio multi-associação. Auditor externo read-only. Contador read-only no financeiro. Jurídico read-only no dossier. Canna Copilot embutido no admin usando mesmos MCP tools/apps. |

Tools Nível 4 (crypto-deletion, role change, recall, SNGPC prod submit, quota change, key rotation, disable 2FA) **ficam fora do MCP** no horizonte v1.0 — sempre tela humana co-presente no admin canônico.

## Mensagem Comercial

> "Você pode usar o canna-oss pela interface web mínima, por API/OpenAPI, ou pelo agente de IA que sua associação já usa — Claude, ChatGPT, Open WebUI ou agente próprio. Telas operacionais nascem dentro do próprio agente via MCP Apps. Ações críticas sempre passam por aprovação humana auditada."

Isso só é verdade se a regra invariante for cumprida em código: **toda interface chama app-services; nenhuma interface bypassa o domain kernel**.

## Referências

- [Model Context Protocol — Specification](https://modelcontextprotocol.io/specification/2025-03-26)
- [MCP Authorization (OAuth 2.1)](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization)
- [MCP Apps — ext-apps](https://github.com/modelcontextprotocol/ext-apps) — UI interativa dentro do chat
- [MCP Apps blog post](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/) — "Bringing UI Capabilities To MCP Clients"
- [Open WebUI](https://github.com/open-webui/open-webui) — cockpit agentic opcional
- [mcpo](https://github.com/open-webui/mcpo) — MCP-to-OpenAPI proxy
- [ADR-001 — Domain Kernel com Emmett](/adr/0001-domain-kernel-emmett/) — sync vs async boundary
- [AGENTS.md](https://github.com/seu-org/canna-oss/blob/main/AGENTS.md) — regras operacionais
