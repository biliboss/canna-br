# canna-oss

OSS cannabis association management system — RDC 1.014 sandbox BR

AGPL-3.0 + CLA. Self-hosted. DDD-designed. LGPD-native.

## Quick Start

```bash
bun install
bun dev      # http://localhost:4335
```

## Key Files

| File | What It Is |
|---|---|
| [`domain/event-storming`](src/content/docs/domain/event-storming.md) | Centerpiece — canonical domain model |
| [`domain/bounded-contexts`](src/content/docs/domain/bounded-contexts.md) | Context map + aggregate boundaries |
| [`research/anvisa-sandbox`](src/content/docs/research/anvisa-sandbox.md) | RDC 1.014/2026 analysis |
| [`business/oss-model`](src/content/docs/business/oss-model.md) | AGPL + CLA + trust moat |
| [`architecture/chain-of-custody`](src/content/docs/architecture/chain-of-custody.md) | ULID trace seed→dispensation |
| [`architecture/lgpd-crypto`](src/content/docs/architecture/lgpd-crypto.md) | AES-256-GCM + crypto-deletion |

## Status

**v0.1.0 — Research + Domain Model**

Docs site live. Application code (Next.js 15 + Fastify 5 + PostgreSQL 16) planned for v0.2+.

## Stack

| Layer | Technology |
|---|---|
| Docs site | Astro 5 + Starlight 0.37 |
| App (planned) | Next.js 15 App Router + TypeScript |
| API (planned) | Fastify 5 + Drizzle ORM + Zod |
| Database (planned) | PostgreSQL 16 + pgAudit + Redis |
| Files (planned) | MinIO (self-hosted S3) |
| Deploy (planned) | Kamal 2 + Docker + Caddy |
