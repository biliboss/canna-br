# canna-oss

OSS cannabis association management system — RDC 1.014 sandbox BR

AGPL-3.0 + CLA. Self-hosted. **Domain-first** (event-sourced kernel). LGPD-native.

## Quick Start

```bash
pnpm install
pnpm dev          # http://localhost:4335 (Astro docs site)
pnpm test:domain  # packages/domain vitest scenario coverage
pnpm verify       # typecheck + tests + lint
```

> Package manager canônico: **pnpm workspaces** (cf. monorepo structure abaixo). Bun foi descontinuado como package manager — usado apenas em experimentos locais opcionais.

## Architecture in One Sentence

**Domain Kernel em TypeScript puro + [Emmett](https://github.com/event-driven-io/emmett) como event-sourcing kernel + raw para todo o resto.**

Domínio é função pura (`decide` / `evolve`). Emmett fornece event store (Postgres + in-memory), command handler e optimistic concurrency. HTTP/UI/DB schema/integração externa ficam explícitos — sem framework mágico.

Decisão registrada em [ADR-001](src/content/docs/adr/0001-domain-kernel-emmett.md).

## Key Files

| File | What It Is |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Canonical spec — workflow Domain Kernel + Verification + Scenario Coverage |
| [`adr/0001-domain-kernel-emmett`](apps/docs/src/content/docs/adr/0001-domain-kernel-emmett.md) | Decisão arquitetural: Emmett como event-sourcing kernel |
| [`architecture/domain-kernel`](apps/docs/src/content/docs/architecture/domain-kernel.md) | Como o kernel funciona — decide/evolve, package layout, ordem de implementação |
| [`architecture/interfaces`](apps/docs/src/content/docs/architecture/interfaces.md) | Minimum Admin + MCP + MCP Apps + Open WebUI + REST |
| [`domain/event-storming`](apps/docs/src/content/docs/domain/event-storming.md) | Centerpiece — canonical domain model |
| [`domain/bounded-contexts`](apps/docs/src/content/docs/domain/bounded-contexts.md) | Context map + aggregate boundaries |
| [`regulatory-assumptions`](apps/docs/src/content/docs/regulatory-assumptions.md) | Confirmadas / Prováveis / Especulativas |
| [`research/anvisa-sandbox`](apps/docs/src/content/docs/research/anvisa-sandbox.md) | RDC 1.014/2026 analysis |
| [`architecture/lgpd-crypto`](apps/docs/src/content/docs/architecture/lgpd-crypto.md) | Envelope encryption (random per-member DEK) + crypto-deletion |

Roadmap canonical: [`apps/docs/src/content/docs/roadmap.md`](apps/docs/src/content/docs/roadmap.md). `ROADMAP.md` raiz é apenas resumo.

## Status

**Current phase: v0.2.0 Domain Kernel Spike** — `packages/domain` em TypeScript puro, sem banco, sem HTTP. Spike gate em [ADR-001](src/content/docs/adr/0001-domain-kernel-emmett.md).

Anteriores:
- v0.1.0 — Domain Blueprint (DONE 2026-06-08). Docs site live com domain model, research, regulatory assumptions, ADR-001, Domain Kernel doc, Interfaces doc.

## Monorepo Structure (pnpm workspaces)

```text
canna-oss/
├── apps/
│   ├── docs/             # Astro 5 + Starlight docs site (current)
│   ├── admin/            # Next.js Minimum Canonical Admin (v0.2.1+)
│   ├── api/              # Fastify HTTP (v0.2.1+)
│   ├── worker/           # BullMQ workers (v0.2.1+)
│   ├── mcp/              # MCP server (v0.3+)
│   └── openapi-bridge/   # mcpo wrapper (v0.3+)
├── packages/
│   ├── domain/           # TypeScript puro, zero framework deps ← CURRENT FOCUS
│   ├── event-store/      # Emmett wiring
│   ├── app-services/     # orchestration
│   ├── read-models/      # Drizzle projections
│   ├── shared/           # Result, errors, ids, clock
│   ├── crypto/           # LGPD envelope encryption
│   ├── sngpc/            # XML builder/adapters
│   ├── reports/          # PDF rendering
│   └── ui-apps/          # MCP Apps + reusable admin components
└── tooling/
    ├── eslint-config/
    ├── tsconfig/
    └── test-utils/
```

## Stack

| Layer | Technology |
|---|---|
| **Domain Kernel** | **TypeScript strict + Emmett + Vitest + ULID** |
| Docs site | Astro 5 + Starlight 0.37 |
| API (v0.2+) | Fastify 5 + Zod (endpoints finos chamando app-services) |
| Read models (v0.2+) | Drizzle ORM + PostgreSQL 16 (projections) |
| Event store (v0.2+) | Emmett PostgreSQL (Emmett in-memory para testes) |
| Workers (v0.2+) | BullMQ + Redis (SNGPC XML, PDF, email) |
| Files (planned) | MinIO (self-hosted S3) |
| Deploy (planned) | Kamal 2 + Docker + Caddy |
