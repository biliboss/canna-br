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
