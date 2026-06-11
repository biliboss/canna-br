---
title: "How we modeled a ledger without speculation using Event Sourcing"
date: 2026-06-10
excerpt: "canna-br's token-ledger is not crypto and not fintech. It is programmable accounting built on event sourcing — so that every economic position of an association is auditable from the very first event."
authors: gabriel
tags:
  - arquitetura
  - event-sourcing
  - ledger
  - oss
---

canna-br needed a ledger from day one. Not because of trends, not because it's "web3" — but because the problem the system solves demands immutable accounting traceability as a legal obligation.

When ANVISA inspects a medical cannabis association, it wants to know: who received what, when, from which batch, based on which prescription, with available balance at the time of dispensation. This is not a management report. It is an audit trail that must survive judicial challenge.

The obvious answer would be a relational database with balance tables. The problem is that mutable balance tables cannot answer a simple question: *what happened to bring the balance to this point?* You can have the right number without having the history. In a regulatory environment, history is what matters.

## The pattern

The solution is Event Sourcing: instead of saving current state, you save each fact that happened. State is derived. History is immutable.

In canna-br, each operation emits one or more domain events. A dispensation generates `DispensationRecorded` and `LotQuantityDeducted` — two atomic, immutable facts with timestamps and metadata. No UPDATE on a balance table. No row disappears. The projection (the balance you see on screen) is computed from the event stream, and can be recomputed at any time for auditing.

The event engine is NATS JetStream, configured as append-only with unlimited retention (`LimitsPolicy` without `MaxAge`). Two pitfalls we learned early:

- `InterestPolicy` deletes messages without an active consumer — destroying history exactly when you need it
- `WorkQueuePolicy` deletes on first ack — same problem

The correct configuration is `LimitsPolicy` with no ceiling. History never disappears.

## Why not blockchain

The inevitable question is: if you want immutability, why not blockchain?

The answer lies in four axes:

**Implementation.** A permissioned blockchain requires node governance, key management, and a consensus protocol. This is not within the operational capacity of a patient association with three volunteers.

**LGPD.** Health data on a public chain — or even a shared permissioned one — creates serious compliance problems. The European GDPR already has rulings on this; the LGPD trend points in the same direction. Crypto-deletion (Art. 18 IV LGPD) on blockchain is technically infeasible without a specific architecture.

**Regulatory surface.** "Blockchain" in the context of cannabis in Brazil is read as "crypto" by any regulatory interlocutor. This creates noise that doesn't help.

**Cost-benefit.** What blockchain offers (immutability, distributed auditing) a local event log already provides with less complexity. The difference is the *distributed trust* component — relevant when there are multiple untrusted parties. Internally to an association, that requirement does not exist.

## The economic layer

Event sourcing resolves the *operational history*. But associations also need *economic positions*: internal balance, collective purchase quotas, guarantees, governance.

For this there is the token-ledger — but the word "token" here is technical, not commercial. What the user sees is "balance", "quota", "guarantee", "level". The backend uses accounting types (`CREDIT`, `PO_SHARE`, `ESCROW`, `REPUTATION_SBT`, `GOVERNANCE_RIGHT`) to maintain correct transferability, idempotency, and segregation rules.

The double-entry logic (debit, credit, balance that never goes negative) is delegated to a ready-made ledger engine — TigerBeetle or Formance. Double-entry accounting is not reimplemented. The pitfalls are well known: idempotency on partial failure, cross-account atomicity, floating-point overflow. These problems have already been solved by the people who built those engines.

## What the auditor sees

When an inspection arrives, the system can reproduce the association's state at any point in time. Each dispensation has a checkpoint hash that links the event to the ledger snapshot at that moment. The auditor can verify that no event was retroactively modified.

This is not a UX feature. It is the product. The system exists to make an association's operation verifiable by an external authority.

## Layered architecture

```
Core AGPL (Emmett — TypeScript)
    ↓ Domain Events
NATS JetStream — immutable log, source of truth
    ↓
Token-Ledger Service (TigerBeetle or Formance)
    ↓
SurrealDB Projections — balance, quotas, statements
    ↓
Projection API → Interface
```

The frontend never accesses JetStream directly. The user never sees a raw event. The interface consumes projections — denormalized reads built for display. When the projection is wrong, you reprocess the stream. The stream never changes.

## What is intentionally locked

The v0.1 ledger has no financial types. `LOAN_POOL_SHARE`, `RECEIVABLE_SHARE`, `YIELD_RIGHT`, `PLANTING_INVESTMENT_POSITION` — all blocked. Not because the architecture doesn't support them, but because a financial product requires a regulated structure that doesn't yet exist. Brazil's CVM classifies crypto-assets as securities by economic substance, not by name. Getting this wrong is not a technical bug.

The architecture was designed so that this barrier is a control, not an accidental limitation. Each economic type has a `regulated_flag` and explicit transferability rules. Nothing is blocked by oversight; it is blocked by decision.

---

The full technical documentation is at [Token-Ledger (architecture)](/en/architecture/token-ledger/) and [Token-Ledger v0.1](/en/business/token-ledger/).

If you want to build this infrastructure together or connect your association as a pilot, [get in touch](mailto:gabriel@devmagic.com.br). The project is open, AGPL-3.0, and the code is being built in public.

---

> **Machine-translated v1** — English version generated by LLM, human polish in progress. Report translation errors to gabriel@devmagic.com.br.
