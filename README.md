# canna-oss

OSS cannabis association management system — RDC 1.014 sandbox BR

AGPL-3.0 + CLA. Self-hosted. **Domain-first** (event-sourced kernel). LGPD-native.

## Quick Start

```bash
bun install
bun dev      # http://localhost:4335
```

## Architecture in One Sentence

**Domain Kernel em TypeScript puro + [Emmett](https://github.com/event-driven-io/emmett) como event-sourcing kernel + raw para todo o resto.**

Domínio é função pura (`decide` / `evolve`). Emmett fornece event store (Postgres + in-memory), command handler e optimistic concurrency. HTTP/UI/DB schema/integração externa ficam explícitos — sem framework mágico.

Decisão registrada em [ADR-001](src/content/docs/adr/0001-domain-kernel-emmett.md).

## Key Files

| File | What It Is |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Canonical spec — workflow Domain Kernel + Verification + Scenario Coverage |
| [`adr/0001-domain-kernel-emmett`](src/content/docs/adr/0001-domain-kernel-emmett.md) | Decisão arquitetural: Emmett como event-sourcing kernel |
| [`architecture/domain-kernel`](src/content/docs/architecture/domain-kernel.md) | Como o kernel funciona — decide/evolve, package layout, ordem de implementação |
| [`domain/event-storming`](src/content/docs/domain/event-storming.md) | Centerpiece — canonical domain model |
| [`domain/bounded-contexts`](src/content/docs/domain/bounded-contexts.md) | Context map + aggregate boundaries |
| [`regulatory-assumptions`](src/content/docs/regulatory-assumptions.md) | Confirmadas / Prováveis / Especulativas |
| [`research/anvisa-sandbox`](src/content/docs/research/anvisa-sandbox.md) | RDC 1.014/2026 analysis |
| [`architecture/lgpd-crypto`](src/content/docs/architecture/lgpd-crypto.md) | AES-256-GCM + crypto-deletion |

Roadmap canonical: [`src/content/docs/roadmap.md`](src/content/docs/roadmap.md). `ROADMAP.md` raiz é apenas resumo.

## Status

**v0.1.0 — Domain Blueprint (DONE)**

Docs site live com domain model, research, regulatory assumptions, ADR. Próximo: v0.2.0 Domain Kernel Spike — `packages/domain` em TypeScript puro, sem banco, sem HTTP.

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
