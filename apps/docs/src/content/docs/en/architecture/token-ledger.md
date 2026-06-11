---
title: "Token-Ledger (architecture)"
description: "JetStream as immutable event log, off-the-shelf double-entry engine (TigerBeetle or Formance), projections in SurrealDB. 100% off-chain in v0.1; on-chain via adapter."
---

> **Stack decision: 100% off-chain in v0.1.** NATS JetStream is the immutable event log — the source of truth. The double-entry ledger is an **off-the-shelf** engine (TigerBeetle or Formance): debit, credit, and balance are not reimplemented. SurrealDB holds projections and read-models. On-chain comes later, as an adapter — never as a rewrite.

This page is the technical counterpart of [Token-Ledger v0.1](/en/business/token-ledger/). It changes nothing in the existing stack: the domain stays in the [Emmett Domain Kernel](/en/architecture/domain-kernel/) and the infrastructure follows the NATS + SurrealDB pivot from [ADR-003](/en/adr/0003-stack-pivot-nats-surreal-dbos/).

## JetStream as event store

JetStream works as an append-only event store — with two operational caveats, verified in the official docs:

| Caveat | Rule |
|---|---|
| Message size | `max_payload` default is **1 MiB**. Events must stay small. Raising the limit (max 64 MB) is a deliberate decision; above 8 MB is not recommended. |
| Retention | **Limits-based with infinite retention** (`LimitsPolicy` without `MaxAge`/`MaxBytes`/`MaxMsgs`). **Never interest-based**: `InterestPolicy` deletes messages with no consumer and after all acks; `WorkQueuePolicy` deletes on the first ack. Both destroy the history. |

## Double-entry engine: comparison

Double-entry looks simple and is not: idempotency, atomicity across accounts, balances that never go negative, audit trail. Getting this wrong means getting accounting wrong — exactly what the anti-pyramid rule exists to prevent. Hence an off-the-shelf engine, not hand-rolled.

| | TigerBeetle | Formance Ledger | Midaz (Lerian) |
|---|---|---|---|
| License (verified) | Apache-2.0 | MIT | Elastic-2.0 — source-available, **not** OSI open source |
| Maturity | 16.2k stars; pre-1.0 (0.17.6); created 2020 | 1.2k stars; v2.4.9 stable; created 2021 | 396 stars; v3.7.6; created 2024; Brazilian vendor |
| Self-host | 1 static binary, zero dependencies; prod recommends 6 replicas | Postgres only; all-in-one docker-compose; official prod via k8s operator | Postgres 17 primary + replica, MongoDB 8, Valkey 8, OTel-LGTM |
| v0.1 fit | Fastest and safest debit/credit primitive; fixed binary schema — metadata lives outside | **Best fit**: MIT license, single dependency, programmable transactions (Numscript), JSON API easy to feed from a JetStream consumer | Overkill: 4+ infra dependencies; Brazilian vendor is the only real plus |

And why not blockchain in v0.1:

| Event-sourced internal ledger | Permissioned blockchain |
|---|---|
| Fast implementation, low cost | Complexity, node governance, keys and custody |
| Simple auditing and queries | Slow migration |
| Native [LGPD](https://www.gov.br/esporte/pt-br/acesso-a-informacao/lgpd) and access control | Little advantage if everything is internal |
| Smaller regulatory and DevOps surface | Risk of looking like a "crypto product" too early |

## Layered architecture

```text
┌────────────────────────────────────────────────────────────┐
│ Core AGPL (Emmett — decide/evolve, TypeScript puro)        │
└───────────────────────────┬────────────────────────────────┘
                            │ Domain Events (outbox)
                            ▼
┌────────────────────────────────────────────────────────────┐
│ NATS JetStream — log imutável, fonte da verdade            │
└───────────────────────────┬────────────────────────────────┘
                            ▼
┌────────────────────────────────────────────────────────────┐
│ Token-Ledger Service                                       │
│ engine de dupla-entrada (TigerBeetle ou Formance):         │
│ contas, movimentos, saldos, idempotência                   │
├──────────────────┬──────────────────┬──────────────────────┤
│ Risk Engine      │ Collection Engine│ Compliance Engine    │
│ score, limite,   │ cronograma,      │ KYB, LGPD,           │
│ provisão         │ cobrança, bloqueio│ audit trail         │
└──────────────────┴────────┬─────────┴──────────────────────┘
                            ▼
┌────────────────────────────────────────────────────────────┐
│ Projeções SurrealDB — read-models: saldo, cotas,           │
│ garantias, reputação, extrato, votações                    │
└───────────────────────────┬────────────────────────────────┘
                            ▼
                    Projection API → Frontend
        sem wallet, sem gas, sem chain, sem token visível

Futuro: On-chain Adapter (merkle root, proof of reserve,
token mirror, settlement regulado) — lê o log; nunca o contrário
```

## Events

Operational (AGPL core):

```text
AssociationCreated, MemberCreated, PatientApproved, PrescriptionRegistered,
CultivationPlanCreated, InputPurchased, BatchCreated, InventoryReceived,
InventoryReserved, InventoryReleased, DispensationRecorded,
QualityCheckPassed, QualityCheckFailed
```

Economic (token-ledger):

```text
AccountOpened, CreditIssued, CreditRedeemed, PurchaseOrderCreated,
PurchaseOrderShareIssued, PurchaseOrderShareRedeemed, EscrowLocked, EscrowReleased,
ReputationUpdated, GovernanceRightGranted, VoteCast, FeeCharged,
PaymentReceived, BalanceAdjusted
```

Risk/collections:

```text
RiskAssessmentRequested, RiskScoreCalculated, CreditLimitGranted, CreditLimitReduced,
PaymentScheduleCreated, PaymentDue, PaymentLate, CollectionNoticeSent,
PositionBlocked, ProvisionCalculated, DefaultRecorded
```

> **The operational core emits facts about the world. The token-ledger turns facts into economic positions. The frontend shows positions in plain language.**

## Reference logical model

The schema below is a **logical model**, not final DDL. The concrete implementation may delegate `ledger_movement` and `ledger_balance` to the chosen engine (TigerBeetle or Formance) and keep in the system only the registry of types, positions, and checkpoints.

```sql
economic_account (
  id uuid primary key,
  owner_type text not null, -- association, member, supplier, infra_company
  owner_id uuid not null,
  status text not null,
  created_at timestamptz not null
)

token_type (
  id text primary key, -- CREDIT, PO_SHARE, ESCROW, REPUTATION, GOVERNANCE
  name text not null,
  transferability text not null, -- non_transferable, restricted, internal
  visible_label text not null,
  regulated_flag boolean not null default false
)

ledger_event (
  id uuid primary key,
  event_type text not null,
  account_id uuid,
  token_type_id text references token_type(id),
  amount numeric(20,6),
  reference_type text,
  reference_id uuid,
  metadata jsonb not null default '{}',
  idempotency_key text unique,
  occurred_at timestamptz not null,
  created_at timestamptz not null
)

ledger_movement (
  id uuid primary key,
  event_id uuid references ledger_event(id),
  debit_account_id uuid references economic_account(id),
  credit_account_id uuid references economic_account(id),
  token_type_id text references token_type(id),
  amount numeric(20,6) not null,
  status text not null,
  created_at timestamptz not null
)

ledger_balance (
  account_id uuid references economic_account(id),
  token_type_id text references token_type(id),
  available numeric(20,6) not null default 0,
  locked numeric(20,6) not null default 0,
  updated_at timestamptz not null,
  primary key (account_id, token_type_id)
)

economic_position (
  id uuid primary key,
  account_id uuid references economic_account(id),
  position_type text not null, -- purchase_order, escrow, reputation, governance
  token_type_id text references token_type(id),
  amount numeric(20,6),
  status text not null,
  reference_type text,
  reference_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null,
  updated_at timestamptz not null
)

ledger_checkpoint (
  id uuid primary key,
  from_event_id uuid,
  to_event_id uuid,
  merkle_root text not null,
  event_count integer not null,
  created_at timestamptz not null
)
```

Financial types (receivables, pools, yield) stay blocked until a regulated structure exists — economic substance defines a security, not the name ([CVM](https://www.gov.br/cvm/pt-br/acesso-a-informacao-cvm/perguntas-frequentes-da-cvm/criptoativos-quando-se-aplicam-as)).

## Governance layer

The [DAO contribution economy](/en/business/dao/) adds tables to the same ledger:

```text
circle, role, role_assignment                  — estrutura sociocrática
tension, proposal, decision                    — fluxo de governança
contribution_entry, contribution_review,
contribution_token_balance                     — ledger de contribuição (CONTRIB)
governance_right, reputation_score             — direitos e reputação
compensation_pool, compensation_distribution   — compensação futura
```

Modeling reference: [Hats Protocol](https://docs.hatsprotocol.xyz/) — roles as ERC-1155 tokens in a tree, where the parent circle grants and revokes the children's roles. It maps almost literally to sociocratic circles with double-linking. In v0.1 this logic is **mirrored off-chain** as data in the system itself; the on-chain protocol (core [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.en.html)) remains a future destination, not a dependency.

## On-chain migration via adapter

When (and if) on-chain makes sense, the internal ledger remains the operational source. The chain receives derivatives:

```text
Ledger interno → Checkpoint → Merkle Root → chain pública/permissionada
Ledger interno → Projection API → Frontend (sem mudança alguma)
Ledger interno → Regulated Token Adapter → Receivable / Pool / Settlement Token
                 → parceiro regulado (Resolução BCB 520)
Tesouraria on-chain futura → Safe (multisig battle-tested)
```

The settlement partner follows [Resolução BCB 520](https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?numero=520&tipo=Resolu%C3%A7%C3%A3o+BCB) (VASP/SPSAV).

> **Three rules that never break:** the frontend never depends on the chain. The user never depends on a wallet. The operational ledger never mixes with a financial offering.

## Related pages

- [Token-Ledger v0.1](/en/business/token-ledger/) — the business model and the token types visible to the user
- [DAO & contribution economy](/en/business/dao/) — circles, roles, CONTRIB, and consent-based governance
- [Domain Kernel](/en/architecture/domain-kernel/) — Emmett, decide/evolve, scenario coverage
- [Technical Stack](/en/architecture/stack/) — full stack and deploy overview

---

> **Machine-translated v1** — English version generated by LLM, human polish in progress. Report translation errors to gabriel@devmagic.com.br.
