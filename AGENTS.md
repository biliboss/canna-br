---
project: canna-oss
repo: /Users/billiboss/.obsidian/99-development/canna-oss
current_version: v0.1.0
site_url: http://localhost:4335
---

# AGENTS.md — canna-oss

OSS cannabis association management system for Brazil, RDC 1.014/2026 sandbox. Self-hosted. AGPL-3.0 + CLA. DDD-designed.

---

## What This Project Is

canna-oss is a complete management system for cannabis therapeutic associations in Brazil:

- **Legal context:** RDC 1.014/2026 (ANVISA sandbox) + STJ Tema 16 (HC judicial base)
- **License:** AGPL-3.0 (free) + CLA (enables dual-licensing for managed hosting)
- **Architecture:** Self-hosted first. No mandatory external SaaS dependencies.
- **Design method:** Domain-Driven Design — Event Storming as canonical domain model
- **Data protection:** LGPD Art. 5 II compliance — AES-256-GCM per member, crypto-deletion Art. 18 IV
- **Compliance:** SNGPC XML native, BSPO auto-generated, chain of custody via ULID permanent

The project is currently in the **Research + Domain Model** phase (v0.1.0). The docs site (Astro 5 + Starlight) documents the domain, architecture, business model, and research. Application code (Next.js 15 + Fastify 5 + PostgreSQL 16) is planned for v0.2+.

---

## Directory Layout

```
canna-oss/
├── AGENTS.md                        ← you are here (canonical spec)
├── README.md                        ← quick start
├── ROADMAP.md                       ← capability-tabled roadmap
├── CHANGELOG.md                     ← per-version changes
├── releases/                        ← per-version release notes
│   └── v0.1.0.md
├── astro.config.mjs                 ← Astro 5 + Starlight config
├── package.json
├── tsconfig.json
└── src/
    └── content/
        └── docs/
            ├── index.mdx            ← site home
            ├── domain/              ← DDD domain model
            │   ├── event-storming.md        ← CENTERPIECE — canonical domain truth
            │   ├── bounded-contexts.md      ← context map + boundaries
            │   ├── domain-events.md         ← event catalog
            │   └── invariants.md            ← business rules that cannot be violated
            ├── research/            ← background research
            │   ├── legal-framework.md       ← STJ Tema 16, CF 196, Portarias
            │   ├── anvisa-sandbox.md        ← RDC 1.014/2026 analysis
            │   ├── anvisa-validation-pathway.md
            │   ├── sngpc.md                 ← SNGPC XML schema + submission
            │   ├── software-landscape.md    ← competitive analysis
            │   ├── international-models.md  ← DE/ES/NL/CA/CO/UY models
            │   └── market-size.md           ← TAM/SAM/SOM Brazil
            ├── architecture/        ← technical design
            │   ├── stack.md                 ← full tech stack
            │   ├── chain-of-custody.md      ← ULID trace seed→dispensation
            │   ├── lgpd-crypto.md           ← AES-256-GCM + crypto-deletion
            │   └── compliance-engine.md     ← SNGPC + BSPO + KPIs + CPC 29
            └── business/            ← business model
                ├── oss-model.md             ← AGPL + CLA + trust moat
                ├── revenue-model.md         ← pricing + projections + FACT deal
                └── gtm.md                   ← GTM sequence + timeline + risks
```

---

## Agent Rules

### Domain First

- **Event Storming is the canonical source of domain truth.** When domain changes (new aggregate, new event, new invariant), update `domain/event-storming.md` first. Other docs derive from it.
- All domain decisions must trace back to a regulation (RDC 1.014, LGPD Art. X, STJ Tema 16) or a bounded context invariant from `domain/invariants.md`. If you cannot trace it, ask before implementing.
- Never model database schema first — model aggregate behavior, derive schema from domain behavior.

### Domain Kernel Workflow (canonical)

The architecture is **domain-pure TypeScript + [Emmett](https://github.com/event-driven-io/emmett) as event-sourcing kernel + raw for everything else**. See `src/content/docs/architecture/domain-kernel.md` for full rationale.

For every domain change, this order is fixed:

1. Add or update the Command/Event/State type in `packages/domain/<context>/`
2. Add GIVEN/WHEN/THEN tests for every scenario (success + at least one rejection + state transition + event payload assertion)
3. Implement `evolve(state, event)` for new events
4. Implement `decide(command, state)` for the command
5. Run `bun test:domain` — all scenarios green
6. **Only then** update app-services, read models, or API

Inverting this order is an architectural regression. Reject the work and restart at step 1.

### Verification

Before declaring any coding task complete, run:

```bash
bun verify
```

A task is **not done** if typecheck, tests, or coverage fail.

For domain-only changes, `bun test:domain` is sufficient and runs in seconds.

### Domain Scenario Coverage

Line coverage is theater. What matters for `packages/domain`:

- 100% of commands have a success test
- 100% of commands have at least one rejection test
- 100% of invariants have a test
- 100% of state transitions have a test
- 100% of events have schema + version asserted
- 100% of expected domain errors have a test

A command without a rejection scenario test is incomplete — domain regulado has no "happy path only".

### Emmett Boundary

Emmett owns: event store (in-memory + Postgres), command handler abstraction, optimistic concurrency, stream loading/appending, test harness.

Emmett does **not** own: HTTP routing, auth, RBAC, LGPD crypto, PDF generation, SNGPC adapter, read-model schema, multi-tenant isolation. Those stay raw and explicit.

Mental rule: **if you cannot imagine swapping Emmett for another event-sourcing library without rewriting the domain, the architecture is wrong.**

`packages/domain` imports **zero** from Emmett. Emmett appears only in `packages/event-store/` and `packages/app-services/`. If you find yourself importing Emmett inside `packages/domain/`, stop and reconsider — the domain is the function `(command, state) → events`, not anything else.

Decision recorded in [ADR-001 — Domain Kernel + Emmett](src/content/docs/adr/0001-domain-kernel-emmett.md), with a spike gate at v0.2.0.

### Interface Invariant

**Every interface calls `packages/app-services`. No interface writes directly to the event store, read model, or domain aggregates.**

Interfaces in the system:

- **Minimum Canonical Admin** (Next.js) — Auth, RBAC, audit, configuration, approval, emergency, signed reports. Always works, no external host dependency.
- **MCP Server** — agent interface; MCP Tools (functions) + MCP Resources (read-only data) + **MCP Apps** (interactive UI rendered inside the chat host)
- **REST/OpenAPI** — system interface for traditional integrations; OpenAPI spec auto-generated; [mcpo](https://github.com/open-webui/mcpo) bridge exposes MCP tools as OpenAPI when host doesn't speak MCP
- **Open WebUI** (optional sidecar) — agentic cockpit "canna-oss AI Workbench". Consumes MCP + OpenAPI. Never source of truth for RBAC, never runs business rules.
- **Worker / Jobs** — internal, for async side effects only (SNGPC XML, PDF, email)

If you are tempted to call Drizzle, the event store, or a decider directly from an HTTP handler, MCP tool, MCP App backend, or worker — stop and route through `app-services`. The whole point of the architecture is that the domain has exactly one entry point.

MCP tools are classified by risk level. **Level 4 tools (`execute_crypto_deletion`, `change_user_role`, `disable_2fa`, `delete_or_rotate_keys`, `submit_sngpc_production`, `change_quota`, `recall_lot`) are NOT exposed via MCP** — they require human UI co-presence in the Minimum Canonical Admin. See `src/content/docs/architecture/interfaces.md` for the full risk matrix and two-step approval flow.

### Minimum Canonical Admin (not ERPzão)

The admin is **deliberately minimal**: Auth, RBAC, audit log, pending actions, configuration, signed reports, emergency tools. Operational screens (dispensation review, traceability, KPI dashboard, lot picker) live as **MCP Apps** in `packages/ui-apps/` — same components rendered inside MCP hosts (Claude, Open WebUI) AND inside the admin web. One UI codebase, two delivery surfaces.

When you are about to add a screen to the admin, ask: "Is this Auth/RBAC/audit/configuration/approval/emergency/signed-report?" If no, it belongs as an MCP App in `packages/ui-apps/`, not the admin.

### Open WebUI Boundary

If `open-webui` is deployed as a sidecar:

- Open WebUI manages: chat UI, conversation history, model selection, RAG on association docs, tool invocation
- canna-oss manages: identity, RBAC, audit, domain state, all writes
- **Never** install Workspace Tools (arbitrary Python) accessible to regular operators — Open WebUI docs warn this equals arbitrary code execution on the server
- **Never** fork/embed Open WebUI inside canna-oss — its license requires preserving branding

### Sync vs Async (regra crítica de dispensação)

**Regulatory state is synchronous/transactional. External integration is asynchronous.**

`RecordDispensation` `decide()` MUST return in a single event store append:

- `DispensationRecorded`
- `MemberQuotaConsumed`
- `LotQuantityDeducted`

Optimistic concurrency on the Dispensation stream guarantees consistency without 2PC. **It is forbidden** to:

- Deduct quota via a separate BullMQ job
- Deduct inventory via a separate BullMQ job
- Treat audit log as an async job — it is a projection of the events themselves

What **does** go to BullMQ (failure must not invalidate the dispensation):

- SNGPC XML generation + submission
- PDF receipt rendering
- Email notification
- Periodic reports (BSPO, KPIs)

Mental rule: **if a system crash between `DispensationRecorded` and the next operation can leave quota/inventory inconsistent with the dispensation, the design is wrong**.

### Package Layout (target)

```
canna-oss/
├── packages/
│   ├── domain/              ← TypeScript puro, zero external deps
│   ├── event-store/         ← Emmett wiring (in-memory + Postgres)
│   ├── app-services/        ← orchestration: load stream → decide → append
│   └── read-models/         ← Drizzle + SQL explícito (projections)
└── apps/
    ├── api/                 ← Fastify endpoints finos
    └── worker/              ← BullMQ workers (PDFs, SNGPC, BSPO)
```

The site (`src/`) is the v0.1 docs site; application code lands in `packages/` and `apps/` starting v0.2.

### Data Integrity

- All monetary values: `DECIMAL(15,2)`, never `float` or `double`. Floating point arithmetic on monetary values is not acceptable anywhere in the codebase.
- Plant ULID is permanent — never reuse even after destruction. Destruction is recorded as an event (with `destroyed_at` timestamp and `destruction_reason`), not as a deletion.
- Audit log is immutable at the **database level** (PostgreSQL RULE), not application level. Application-level soft deletes are insufficient for compliance.

### LGPD

- Never log or print member PII (name, CPF, medical data) in plaintext to console, logs, or error messages.
- CPF is never stored in plaintext — always SHA-256(cpf + site_salt).
- Crypto-deletion (Art. 18 IV) is the correct implementation of the right to erasure for data with referential integrity constraints (chain of custody, audit log).

### Compliance Engine

- SNGPC XML schema: validate against official XSD before sending. Never send unvalidated XML to RNDS.
- BSPO saldo formula: `entradas - saídas - perdas = saldo`. Always assert saldo === SUM(inventory_lots.quantity_g) in the BSPO generation job. Discrepancy > 0 blocks BSPO generation and alerts the responsável técnico.
- CPC 29 / IAS 41: plants-in-cultivation are biological assets. Do not classify them as inventory until harvested.

### File Operations (vault rules apply)

- Never overwrite full files — use atomic edits.
- When editing docs, preserve frontmatter key order: title, description (as declared in Starlight config).
- Never rename files without updating all internal `[link](/path)` references.

---

## Dev Commands

```bash
bun install        # install dependencies
bun dev            # start Astro dev server (port 4335)
bun build          # production build
bun preview        # preview production build
```

Site runs at `http://localhost:4335`.
