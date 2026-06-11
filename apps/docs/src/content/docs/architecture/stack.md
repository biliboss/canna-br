---
title: "Stack Técnico"
description: "Domain kernel (Emmett) + MCP Server + MCP Apps + Open WebUI sidecar + Fastify 5 + PostgreSQL 16 + MinIO + Kamal 2. NO admin Next.js (cf. ADR-002)."
---

## Stack Completo

> Arquitetura central: **Domain Kernel em TypeScript puro + [Emmett](https://github.com/event-driven-io/emmett) como event-sourcing kernel + raw para todo o resto** ([ADR-001](/adr/0001-domain-kernel-emmett/)). Ver [Domain Kernel](/architecture/domain-kernel/).
>
> Primary surface (ADR-002): **MCP Server + MCP Apps + Open WebUI sidecar OBRIGATÓRIO**. **Sem admin Next.js até pós-v1.0.** Ver [Interfaces](/architecture/interfaces/) e [ADR-002](/adr/0002-mcp-first-surface/).

### Domain Kernel (núcleo)

| Tecnologia | Papel |
|---|---|
| TypeScript (strict) | `packages/domain` — funções puras `decide` / `evolve` |
| Emmett (event-driven-io) | Event store (in-memory + Postgres), command handler, optimistic concurrency, test harness |
| Vitest | Testes GIVEN/WHEN/THEN, scenario coverage, watch mode |
| ULID (`ulid` npm) | IDs lexicograficamente ordenáveis para eventos e aggregates |

### Primary Surface — MCP Server + MCP Apps + Open WebUI (ADR-002)

> Sem admin Next.js standalone. Toda interação humana via Open WebUI + MCP Apps inline. REST `apps/api` cobre Nível-4 critical commands + integrações. Ver [Interfaces](/architecture/interfaces/).

### Agent Interface — MCP Server + MCP Apps

| Tecnologia | Papel |
|---|---|
| MCP Server (`@modelcontextprotocol/sdk`) | Exposição de Tools (commands) + Resources (read models) + Apps (UI inline) — consumido por Claude / ChatGPT / Open WebUI |
| [MCP Apps (`ext-apps`)](https://github.com/modelcontextprotocol/ext-apps) | Componentes UI interativos renderizados dentro do chat — substituem 80+ telas CRUD de ERP tradicional. v0.2.1: `MemberQuotaCardApp`, `TraceabilityTimelineApp`, `DispensationFormApp`. v0.3+: `InventoryLotPickerApp`, `MemberSearchApp`, `SngpcPendingApp`, `KpiDashboardApp`, `BspoReviewApp`, `RipdReviewApp`, `LgpdRequestsApp`, `AuditTimelineApp` |
| `packages/ui-apps/` | Pacote canônico — manifests + HTML bundles (single-file via vite-plugin-singlefile). Registry em `src/registry.ts`. |
| OAuth 2.1 (per MCP spec) | Autorização agente↔canna-oss; agente age em nome de usuário humano com escopo limitado |
| OpenAPI auto-gerado | Para hosts OpenAPI-only (Open WebUI Tools, integradores tradicionais) |
| [mcpo bridge](https://github.com/open-webui/mcpo) | MCP-to-OpenAPI proxy quando host não fala MCP nativo |
| [Open WebUI](https://github.com/open-webui/open-webui) v0.9.6+ (sidecar OBRIGATÓRIO) | Chat host primário — `ghcr.io/open-webui/open-webui:v0.9.6` em docker-compose. MCP server registrado via config file. OAuth 2.1 mapeando scopes para canna roles. **Workspace Tools desabilitado** (`ENABLE_KB_EXEC=false`). |

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

### Token-Ledger (camada econômica)

> Mesmo padrão do kernel: log imutável + engine pronto + projeções. Não é um mundo separado. Ver [Token-Ledger (arquitetura)](/architecture/token-ledger/).

| Tecnologia | Papel |
|---|---|
| NATS JetStream | Event log imutável — fonte da verdade do ledger |
| Formance Ledger (MIT) — candidato | Engine de dupla-entrada pronto — débito/crédito não se reimplementam |
| SurrealDB | Projeções / read-models do ledger |

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
