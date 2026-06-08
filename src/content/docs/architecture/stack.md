---
title: "Stack Técnico"
description: "Domain kernel (Emmett) + Minimum Admin (Next.js) + MCP Server + MCP Apps + Open WebUI sidecar + Fastify 5 + PostgreSQL 16 + MinIO + Kamal 2."
---

## Stack Completo

> Arquitetura central: **Domain Kernel em TypeScript puro + [Emmett](https://github.com/event-driven-io/emmett) como event-sourcing kernel + raw para todo o resto**. Ver [Domain Kernel](/architecture/domain-kernel/) para o porquê e o como.
>
> Camada de interfaces agentic: **MCP Server + MCP Apps + OpenAPI + Open WebUI (sidecar opcional)**. Ver [Interfaces](/architecture/interfaces/).

### Domain Kernel (núcleo)

| Tecnologia | Papel |
|---|---|
| TypeScript (strict) | `packages/domain` — funções puras `decide` / `evolve` |
| Emmett (event-driven-io) | Event store (in-memory + Postgres), command handler, optimistic concurrency, test harness |
| Vitest | Testes GIVEN/WHEN/THEN, scenario coverage, watch mode |
| ULID (`ulid` npm) | IDs lexicograficamente ordenáveis para eventos e aggregates |

### Frontend — Minimum Canonical Admin

> Admin **mínimo e regulatório** (Auth/RBAC/Audit/Approval/Emergency/Signed Reports). Telas operacionais migram para MCP Apps em `packages/ui-apps/`. Ver [Interfaces](/architecture/interfaces/).

| Tecnologia | Papel |
|---|---|
| Next.js 15 App Router | Framework React com RSC — apenas para o admin canônico mínimo |
| TypeScript (strict) | Type safety ponta a ponta |
| shadcn/ui + Radix | Componentes acessíveis, sem vendor lock |
| Tailwind CSS | Estilização utilitária |
| PWA (next-pwa) | Instalável sem app store |

### Agent Interface — MCP Server + MCP Apps

| Tecnologia | Papel |
|---|---|
| MCP Server (`@modelcontextprotocol/sdk`) | Exposição de Tools (commands) + Resources (read models) + Apps (UI inline) — consumido por Claude / ChatGPT / Open WebUI |
| [MCP Apps (`ext-apps`)](https://github.com/modelcontextprotocol/ext-apps) | Componentes UI interativos renderizados dentro do chat — `DispensationReviewApp`, `TraceabilityTimelineApp`, `KpiDashboardApp`, `PendingActionApprovalApp`, `InventoryLotPickerApp`, `MemberQuotaCardApp` |
| `packages/ui-apps/` | Pacote compartilhado — mesmo componente renderiza em MCP host E no Minimum Admin |
| OAuth 2.1 (per MCP spec) | Autorização agente↔canna-oss; agente age em nome de usuário humano com escopo limitado |
| OpenAPI auto-gerado | Para hosts OpenAPI-only (Open WebUI Tools, integradores tradicionais) |
| [mcpo bridge](https://github.com/open-webui/mcpo) | MCP-to-OpenAPI proxy quando host não fala MCP nativo |
| [Open WebUI](https://github.com/open-webui/open-webui) (sidecar opcional) | Cockpit agentic "canna-oss AI Workbench" — chat UI + RAG + multi-model. **Nunca** fonte de verdade de RBAC ou regras de negócio. |

### Backend

| Tecnologia | Papel |
|---|---|
| Fastify 5 | HTTP server fino — chama `app-services`, sem regra de negócio |
| Drizzle ORM | **Apenas read models** — schema explícito, SQL legível. Event store é Emmett, não Drizzle. |
| Zod | Validação de schema HTTP em runtime |
| BullMQ | Side effects assíncronos (PDFs, SNGPC, BSPO) |
| Redis | BullMQ broker + cache de read model |

### Database

| Tecnologia | Papel |
|---|---|
| PostgreSQL 16 | Banco principal com pgAudit |
| pgAudit | Log de auditoria imutável por evento SQL |
| Redis 7 | Cache de sessão + filas |
| BullMQ | Worker de jobs assíncronos |

### Arquivos & PDFs

| Tecnologia | Papel |
|---|---|
| MinIO | S3-compatible self-hosted (laudos, docs) |
| Puppeteer headless | Geração de PDFs (relatórios, carteirinhas) |

### Auth

| Tecnologia | Papel |
|---|---|
| JWT (jose) | Tokens de sessão stateless |
| TOTP (speakeasy) | 2FA nativo sem SaaS |

Não há dependência de Auth0, Clerk, Supabase Auth ou qualquer SaaS externo. Dados de membro permanecem no servidor da associação.

### Deploy & Infra

| Tecnologia | Papel |
|---|---|
| Kamal 2 | Deploy zero-downtime via Docker |
| Docker + Compose | Containerização local e CI |
| Caddy | Reverse proxy + TLS automático (Let's Encrypt) |
| Hetzner DE | VPS GDPR-aligned (Frankfurt) |
| Restic + S3 | Backup cifrado incremental |
| Grafana + Prometheus | Observabilidade interna |

---

## Por Que Self-Hosted é Não-Negociável

**LGPD Art. 5 II — dados de saúde como dados sensíveis:**

Prescrições médicas, condições tratadas, histórico de dispensação e documentos médicos dos membros são dados sensíveis na definição da LGPD. Armazená-los em SaaS multi-tenant (Supabase, PlanetScale, AWS RDS SaaS) cria risco jurídico direto para a diretoria da associação:

- Necessidade de RIPD (Relatório de Impacto à Proteção de Dados)
- Contrato de processamento com cada sub-processador
- Transferência internacional (maioria dos SaaS) requer BCRs ou cláusulas padrão ANPD
- **Responsabilidade solidária** da diretoria em caso de vazamento

Self-hosted elimina todos esses vetores: dados ficam no servidor da associação, sob controle exclusivo do DPO nomeado.

---

## Opções de Deploy

### Opção A — Hetzner + Kamal (recomendada)

```
Hetzner CX22 DE (€5.92/mês) + Kamal 2 + Caddy TLS auto
```

- VPS Frankfurt, GDPR-aligned
- TLS automático via Let's Encrypt
- Deploy zero-downtime com `kamal deploy`
- Backup Restic → Hetzner Object Storage (Frankfurt)
- Custo total: ~€15–25/mês (VPS + storage + snapshot)

### Opção B — Mini-PC + Tailscale Zero Porta

```
Intel NUC ou Raspberry Pi 5 + Docker + Tailscale funnel
```

- Hardware próprio da associação (sem pagamento mensal)
- Zero porta aberta na internet — acesso exclusivo via Tailscale
- Ideal para associações com TI interno
- Risco: dependência do hardware físico (requer backup Restic externo)

### Opção C — Multi-Tenant Managed Hosting

```
Schema isolation por associação + plano managed (canna-oss cloud)
```

- Modelo de negócio SaaS gerenciado pelo canna-oss
- Infraestrutura compartilhada com isolamento por schema PostgreSQL
- Contratos de processamento pré-negociados (DPA padrão LGPD)
- Ver: [Revenue Model](/business/revenue-model)

---

## Discretion by Design

Associações operam em zona cinzenta regulatória. O sistema é projetado para não chamar atenção:

| Princípio | Implementação |
|---|---|
| URLs neutras | `/app.associacao.com.br` — sem "cannabis" na URL |
| PWA sem app store | Instalação direta via browser, sem Apple/Google review |
| Zero telemetria terceiros | Sem Google Analytics, Meta Pixel, Hotjar |
| White-label por associação | Nome, logo e cores customizáveis por tenant |
| Nenhum cookie de rastreamento | Sessão JWT only, sem third-party cookies |
| Domínio próprio | Cada associação usa seu próprio domínio/subdomínio |

O sistema não coleta nem transmite dados para nenhum servidor externo fora do controle da associação.
