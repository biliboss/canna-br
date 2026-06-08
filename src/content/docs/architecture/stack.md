---
title: "Stack Técnico"
description: "Next.js 15 + Fastify 5 + PostgreSQL 16 + MinIO + Kamal 2 — stack self-hosted para associações de cannabis."
---

## Stack Completo

### Frontend

| Tecnologia | Papel |
|---|---|
| Next.js 15 App Router | Framework React com RSC |
| TypeScript (strict) | Type safety ponta a ponta |
| shadcn/ui + Radix | Componentes acessíveis, sem vendor lock |
| Tailwind CSS | Estilização utilitária |
| PWA (next-pwa) | Instalável sem app store |

### Backend

| Tecnologia | Papel |
|---|---|
| Fastify 5 | HTTP server de alta performance |
| Drizzle ORM | Type-safe SQL, migrations versionadas |
| Zod | Validação de schema em runtime |
| BullMQ | Filas de jobs (relatórios, SNGPC batch) |
| Redis | Cache + pub/sub + BullMQ broker |

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
