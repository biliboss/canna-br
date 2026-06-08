# canna-oss

OSS cannabis association management system — RDC 1.014 sandbox BR

AGPL-3.0 + CLA. Self-hosted. **Domain-first** (event-sourced kernel) + **MCP-first** (Open WebUI + MCP Apps substitui admin web). LGPD-native.

## Quick Start

```bash
pnpm install
pnpm dev          # http://localhost:4335 (Astro docs site)
pnpm test:domain  # @canna/domain vitest scenario coverage
pnpm verify       # typecheck + tests across all workspaces
```

> Package manager canônico: **pnpm workspaces**.

## Architecture in Two Sentences

**Domain Kernel em TypeScript puro + [Emmett](https://github.com/event-driven-io/emmett) como event-sourcing kernel + raw para todo o resto** ([ADR-001](apps/docs/src/content/docs/adr/0001-domain-kernel-emmett.md)).

**Surface primário = MCP server + MCP Apps inline em Open WebUI**. Sem admin Next.js standalone até pós-v1.0 ([ADR-002](apps/docs/src/content/docs/adr/0002-mcp-first-surface.md)).

## Key Files

| File | What It Is |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Canonical spec — workflow Domain Kernel + Interface Invariant + MCP Apps Surface + Open WebUI Boundary |
| [`adr/0001-domain-kernel-emmett`](apps/docs/src/content/docs/adr/0001-domain-kernel-emmett.md) | Domain kernel + Emmett event-sourcing kernel (spike gate PASSED) |
| [`adr/0002-mcp-first-surface`](apps/docs/src/content/docs/adr/0002-mcp-first-surface.md) | MCP-first surface — substitui admin Next.js |
| [`architecture/domain-kernel`](apps/docs/src/content/docs/architecture/domain-kernel.md) | Como o kernel funciona — decide/evolve, package layout, ordem de implementação |
| [`architecture/interfaces`](apps/docs/src/content/docs/architecture/interfaces.md) | MCP Server + MCP Apps + Open WebUI + REST. Admin Next.js NÃO. |
| [`domain/event-storming`](apps/docs/src/content/docs/domain/event-storming.md) | Centerpiece — canonical domain model |
| [`domain/bounded-contexts`](apps/docs/src/content/docs/domain/bounded-contexts.md) | Context map + aggregate boundaries |
| [`regulatory-assumptions`](apps/docs/src/content/docs/regulatory-assumptions.md) | Confirmadas / Prováveis / Especulativas |
| [`research/anvisa-sandbox`](apps/docs/src/content/docs/research/anvisa-sandbox.md) | RDC 1.014/2026 analysis |
| [`architecture/lgpd-crypto`](apps/docs/src/content/docs/architecture/lgpd-crypto.md) | Envelope encryption (random per-member DEK) + crypto-deletion |

Roadmap canonical: [`apps/docs/src/content/docs/roadmap.md`](apps/docs/src/content/docs/roadmap.md). `ROADMAP.md` raiz é apenas resumo.

## Status

**Current phase: v0.2.1 Compliance Spine + MCP-First Surface** — building `apps/api`, `@canna/read-models`, `apps/mcp` tools, `packages/ui-apps` MCP Apps, Open WebUI sidecar wiring.

Anteriores:
- v0.2.0b — Emmett Postgres adapter validated via testcontainers (ADR-001 spike gate PASSED, 6 PG specs green)
- v0.2.0a — Emmett in-memory + domain kernel (50 domain + 8 event-store + 6 app-services tests green)
- v0.1.0 — Domain Blueprint (DONE 2026-06-08, docs site live)

## Monorepo Structure (pnpm workspaces)

```text
canna-oss/
├── apps/
│   ├── docs/             # @canna/docs — Astro 5 + Starlight docs site
│   ├── mcp/              # @canna/mcp — MCP server (Tools L1+L2+L3 + ext-apps) ← PRIMARY SURFACE
│   ├── api/              # @canna/api — Fastify thin endpoints (v0.2.1)
│   ├── worker/           # @canna/worker — BullMQ workers (v0.2.1)
│   └── openapi-bridge/   # optional mcpo wrapper for OpenAPI-only hosts (v0.2.1)
├── packages/
│   ├── domain/           # @canna/domain — TypeScript puro, zero framework deps
│   ├── event-store/      # @canna/event-store — Emmett in-memory + Postgres
│   ├── app-services/     # @canna/app-services — orchestration load→decide→append
│   ├── read-models/      # @canna/read-models — Drizzle projections (v0.2.1)
│   ├── shared/           # @canna/shared — Result, errors, ids, clock, QuantityGrams
│   ├── crypto/           # @canna/crypto — LGPD envelope encryption (v0.2.1)
│   ├── sngpc/            # @canna/sngpc — XML builder/adapters (v0.5)
│   ├── reports/          # @canna/reports — PDF rendering (v0.3+)
│   └── ui-apps/          # @canna/ui-apps — MCP Apps (substitui admin Next.js)
└── tooling/
    ├── tsconfig/         # @canna/tsconfig — shared base.json
    └── test-utils/       # @canna/test-utils — scenario DSL + agent-logger + agent-reporter
```

> **Sem `apps/admin`.** Admin Next.js standalone foi descartado em 2026-06-08 ([ADR-002](apps/docs/src/content/docs/adr/0002-mcp-first-surface.md)). Toda interação humana acontece via Open WebUI + MCP Apps inline. `apps/api` REST cobre integrações + Nível-4 critical commands.

## Stack

| Layer | Technology |
|---|---|
| **Domain Kernel** | TypeScript strict + Emmett + Vitest + ULID |
| **MCP Server** | `@modelcontextprotocol/sdk` + `@modelcontextprotocol/ext-apps` (TS) |
| **MCP Apps** | HTML + vanilla JS (single-file bundle, vite-plugin-singlefile) |
| **Chat host** | Open WebUI v0.9.6+ (self-hosted sidecar) |
| Docs site | Astro 5 + Starlight 0.37 |
| API (v0.2.1+) | Fastify 5 + Zod (endpoints finos chamando app-services) |
| Read models (v0.2.1+) | Drizzle ORM + PostgreSQL 16 (projections) |
| Event store | Emmett PostgreSQL (in-memory para testes) |
| Workers (v0.2.1+) | BullMQ + Redis (SNGPC XML, PDF, email) |
| Crypto (v0.2.1+) | Web Crypto API — envelope encryption (random per-member DEK) |
| Files (planned) | MinIO (self-hosted S3) |
| Deploy (planned) | Kamal 2 + Docker + Caddy → `canna.fonsecagabriel.com.br` (VPS 62.171.145.76) |
