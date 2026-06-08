---
project: canna-oss
repo: /Users/billiboss/.obsidian/99-development/canna-oss
current_phase: v0.2.1-compliance-spine-mcp-first
current_focus: apps/mcp tools + packages/ui-apps MCP Apps + apps/api Fastify + @canna/read-models projections
surface_pivot: MCP-first (ADR-002 — 2026-06-08). Open WebUI + MCP server + MCP Apps substitui admin Next.js. NO apps/admin no roadmap.
do_not_start:
  - apps/admin (deferred to Ideas Park; substituído por MCP Apps)
package_manager: pnpm
deploy_target_future: canna.fonsecagabriel.com.br (Kamal v2, VPS 62.171.145.76, wildcard DNS; reusa skill langfuse-fonsecagabriel)
site_url: http://localhost:4335
---

# AGENTS.md — canna-oss

OSS cannabis association management system for Brazil, RDC 1.014/2026 sandbox. Self-hosted. AGPL-3.0 + CLA. DDD-designed + event-sourced kernel + **MCP-first agentic surface**.

**Current focus (v0.2.1):** ship Compliance Spine MCP-first — `apps/api` (Fastify endpoints), `@canna/read-models` (Drizzle projections), `apps/mcp` (Tools L1+L2+L3 + ext-apps), `packages/ui-apps` (MCP Apps), `apps/worker` (BullMQ SNGPC/PDF), `@canna/crypto` (envelope encryption), Open WebUI sidecar wired. **No admin Next.js** — see [ADR-002](apps/docs/src/content/docs/adr/0002-mcp-first-surface.md).

Previous phases:
- v0.2.0a — Emmett in-memory ADR-001 spike gate PASSED (50 domain + 8 event-store + 6 app-services tests green)
- v0.2.0b — Emmett Postgres adapter validated via testcontainers (6 PG specs green)

---

## What This Project Is

canna-oss is a complete management system for cannabis therapeutic associations in Brazil:

- **Legal context:** RDC 1.014/2026 (ANVISA sandbox) + STJ Tema 16 (HC judicial base)
- **License:** AGPL-3.0 (free) + CLA (enables dual-licensing for managed hosting)
- **Architecture:** Self-hosted first. No mandatory external SaaS dependencies.
- **Design method:** Domain-Driven Design — Event Storming as canonical domain model
- **Data protection:** LGPD Art. 5 II compliance — AES-256-GCM per member, crypto-deletion Art. 18 IV
- **Compliance:** SNGPC XML native, BSPO auto-generated, chain of custody via ULID permanent

v0.1.0 Domain Blueprint shipped 2026-06-08. v0.2.0a/b spike gate PASSED. Project now in **v0.2.1 Compliance Spine + MCP-first surface** — building `apps/api` + `@canna/read-models` + `apps/mcp` + `packages/ui-apps` + Open WebUI sidecar wiring. Admin Next.js was **dropped** from the plan ([ADR-002](apps/docs/src/content/docs/adr/0002-mcp-first-surface.md)).

---

## Directory Layout (pnpm monorepo)

```
canna-oss/
├── AGENTS.md                        ← canonical spec (you are here)
├── README.md                        ← quick start
├── ROADMAP.md                       ← summary; canonical at apps/docs/src/content/docs/roadmap.md
├── CHANGELOG.md                     ← per-version changes
├── releases/                        ← per-version release notes
├── package.json                     ← workspace orchestrator (pnpm scripts)
├── pnpm-workspace.yaml              ← apps/* + packages/* + tooling/*
├── tsconfig.json                    ← project references root
├── apps/
│   ├── docs/                        ← @canna/docs — Astro 5 + Starlight
│   ├── mcp/                         ← @canna/mcp — MCP server (Tools L1+L2+L3 + ext-apps) ← PRIMARY SURFACE
│   ├── api/                         ← @canna/api — Fastify thin endpoints (v0.2.1)
│   ├── worker/                      ← @canna/worker — BullMQ (SNGPC, PDF, email) (v0.2.1)
│   └── openapi-bridge/              ← optional mcpo wrapper for OpenAPI-only hosts (v0.2.1)
│       ├── astro.config.mjs
│       ├── package.json
│       ├── tsconfig.json
│       ├── public/
│       └── src/content/docs/
│           ├── index.mdx            ← site home
│           ├── regulatory-assumptions.md
│           ├── roadmap.md           ← canonical roadmap
│           ├── adr/0001-domain-kernel-emmett.md  ← ADR-001
│           ├── domain/              ← DDD: event-storming, bounded-contexts, events, invariants
│           ├── research/            ← legal/anvisa/sngpc/market research
│           ├── architecture/        ← stack, domain-kernel, interfaces, chain-of-custody, lgpd-crypto, compliance-engine
│           └── business/            ← oss-model, revenue-model, gtm
├── packages/
│   ├── domain/                      ← @canna/domain — TS puro, zero framework deps ← CURRENT FOCUS
│   ├── shared/                      ← @canna/shared — Result, errors, ids, clock
│   ├── event-store/                 ← @canna/event-store (v0.2.0 spike)
│   ├── app-services/                ← @canna/app-services (post-spike)
│   ├── read-models/                 ← @canna/read-models (post-spike)
│   ├── crypto/                      ← @canna/crypto — LGPD envelope encryption
│   ├── sngpc/                       ← @canna/sngpc (v0.5+)
│   ├── reports/                     ← @canna/reports (v0.3+)
│   └── ui-apps/                     ← @canna/ui-apps — MCP Apps + admin (v0.4+)
└── tooling/
    ├── tsconfig/                    ← @canna/tsconfig — shared base.json
    ├── eslint-config/               ← (post-spike)
    └── test-utils/                  ← (post-spike)
```

---

## Agent Rules

### Domain First

- **Event Storming is the canonical source of domain truth.** When domain changes (new aggregate, new event, new invariant), update `domain/event-storming.md` first. Other docs derive from it.
- All domain decisions must trace back to a regulation (RDC 1.014, LGPD Art. X, STJ Tema 16) or a bounded context invariant from `domain/invariants.md`. If you cannot trace it, ask before implementing.
- Never model database schema first — model aggregate behavior, derive schema from domain behavior.

### Domain Kernel Workflow (canonical)

The architecture is **domain-pure TypeScript + [Emmett](https://github.com/event-driven-io/emmett) as event-sourcing kernel + raw for everything else**. See `apps/docs/src/content/docs/architecture/domain-kernel.md` for full rationale.

For every domain change, this order is fixed:

1. Add or update the Command/Event/State type in `packages/domain/<context>/`
2. Add GIVEN/WHEN/THEN tests for every scenario (success + at least one rejection + state transition + event payload assertion)
3. Implement `evolve(state, event)` for new events
4. Implement `decide(command, state)` for the command
5. Run `pnpm test:domain` — all scenarios green
6. **Only then** update app-services, read models, or API

Inverting this order is an architectural regression. Reject the work and restart at step 1.

### Verification

Before declaring any coding task complete, run:

```bash
pnpm verify
```

A task is **not done** if typecheck, tests, or coverage fail.

For domain-only changes, `pnpm test:domain` is sufficient and runs in seconds.

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

Decision recorded in [ADR-001 — Domain Kernel + Emmett](apps/docs/src/content/docs/adr/0001-domain-kernel-emmett.md), with a spike gate at v0.2.0.

### Interface Invariant

**Every interface calls `packages/app-services`. No interface writes directly to the event store, read model, or domain aggregates.**

Interfaces in the system (post-pivot — see [ADR-002](apps/docs/src/content/docs/adr/0002-mcp-first-surface.md)):

- **MCP Server** (`apps/mcp`) — **primary product surface**. MCP Tools (commands) + Resources (read models) + **MCP Apps** (interactive HTML rendered inline in the chat host). Roles enforced via OAuth scope mapping (DISPENSADOR/RESPONSAVEL_TECNICO/DPO/DIRETORIA/AUDITOR/FEDERATION).
- **Open WebUI** (sidecar, OBRIGATÓRIO em v0.2.1) — chat host that consumes `apps/mcp`. Self-hosted `ghcr.io/open-webui/open-webui:v0.9.6`. Never source of truth for RBAC. Workspace Tools (Python) disabled in prod.
- **REST/OpenAPI** (`apps/api`) — system interface for traditional integrations + Nível-4 critical commands that require TOTP (crypto-deletion, role change, SNGPC prod submit). `mcpo` bridge available for OpenAPI-only hosts.
- **Worker / Jobs** (`apps/worker`) — internal, async side effects only (SNGPC XML, PDF, email).

**NO admin Next.js standalone** until post-v1.0. If you find yourself sketching a Next.js admin page, stop. Render as MCP App in `packages/ui-apps/`. If the workflow does not fit chat conversation, that is signal the workflow belongs to the Nível-4 set at `apps/api` REST + TOTP, not a new admin.

If you are tempted to call Drizzle, the event store, or a decider directly from an HTTP handler, MCP tool, MCP App backend, or worker — stop and route through `app-services`. The domain has exactly one entry point.

MCP tools are classified by risk level. **Level 4 tools (`execute_crypto_deletion`, `change_user_role`, `disable_2fa`, `delete_or_rotate_keys`, `submit_sngpc_production`, `change_quota`, `recall_lot`) are NOT exposed via MCP** — they live in `apps/api` REST with TOTP + DPO/Admin co-presence. See `apps/docs/src/content/docs/architecture/interfaces.md` for the full risk matrix and two-step approval flow.

### MCP Apps surface (substitui admin canônico)

Operational screens live as **MCP Apps** in `packages/ui-apps/` per ADR-002:

- `MemberQuotaCardApp` (Level 1, read-only card) — `ui://member-quota-card/app.html`
- `TraceabilityTimelineApp` (Level 1, timeline) — `ui://traceability-timeline/app.html`
- `DispensationFormApp` (Level 3, form + PendingAction submit) — `ui://dispensation-form/app.html`
- v0.3+: `InventoryLotPickerApp`, `MemberSearchApp`, `SngpcPendingApp`, `KpiDashboardApp`, `LgpdRequestsApp`, etc.

Each app is a single-file HTML bundle (vite-plugin-singlefile, future) declared in `packages/ui-apps/src/registry.ts`. MCP tool returns JSON → host renders the app inline → user interacts → app calls back into MCP tools via `postMessage({ type: "ui/tools/call", ... })`. Servidor-side, the tool returns content + `_meta.ui.resourceUri` pointing to the app.

When adding a new operational screen, ask: "Does this fit in chat conversation context?"
- **Yes** → MCP App in `packages/ui-apps/` + MCP tool in `apps/mcp/src/tools/`.
- **No, requires TOTP co-presence** → `apps/api` REST handler + future emergency CLI/tool. Never an admin Next.js page.

### Open WebUI Boundary

Open WebUI v0.9.6+ is deployed as a sidecar in v0.2.1:

- Open WebUI manages: chat UI, conversation history, model selection (Gemini Algieba via OpenRouter recommended), RAG on association docs, tool invocation, OAuth groups
- canna-oss (`apps/mcp` + `apps/api`) manages: identity, RBAC, audit, domain state, all writes
- **Never** install Workspace Tools (arbitrary Python) accessible to regular operators — RCE vector per Open WebUI docs. Set `ENABLE_KB_EXEC=false` in compose env.
- **Never** fork/embed Open WebUI inside canna-oss — Open WebUI license requires preserving branding.
- **Never** rely on Open WebUI as the only entry — `apps/api` REST stays accessible for emergency operations + Nível-4 critical commands.

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

## Dev Commands (pnpm workspace)

```bash
pnpm install         # install all workspace deps
pnpm dev             # start Astro docs dev server (port 4335)
pnpm test:domain     # vitest run on @canna/domain
pnpm test:watch      # vitest watch on @canna/domain
pnpm typecheck       # tsc --noEmit across all packages (-r --if-present)
pnpm verify          # typecheck + test (verify gate before declaring task done)
pnpm build           # production build all workspaces
pnpm preview         # preview production build of docs
```

Docs site runs at `http://localhost:4335`. Package manager is **pnpm** — never use `bun`/`npm`/`yarn` for dependency or script commands.
