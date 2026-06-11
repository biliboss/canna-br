---
title: "Token-Ledger (arquitetura)"
description: "JetStream como log de eventos imutável, engine de dupla-entrada pronto (TigerBeetle ou Formance), projeções em SurrealDB. 100% off-chain na v0.1; on-chain por adaptador."
---

> **Decisão de stack: 100% off-chain na v0.1.** NATS JetStream é o log de eventos imutável — a fonte da verdade. O ledger de dupla-entrada é um engine **pronto** (TigerBeetle ou Formance): débito, crédito e saldo não se reimplementam. SurrealDB guarda projeções e read-models. On-chain entra depois, como adaptador — nunca como reescrita.

Esta página é a contraparte técnica do [Token-Ledger v0.1](/business/token-ledger/). Ela não muda nada no stack existente: o domínio continua no [Domain Kernel Emmett](/architecture/domain-kernel/) e a infraestrutura segue o pivot NATS + SurrealDB do [ADR-003](/adr/0003-stack-pivot-nats-surreal-dbos/).

## JetStream como event store

JetStream funciona como event store append-only — com duas ressalvas operacionais, verificadas na doc oficial:

| Ressalva | Regra |
|---|---|
| Tamanho de mensagem | `max_payload` default é **1 MiB**. Eventos devem ser pequenos. Subir o limite (máx. 64 MB) é decisão deliberada; acima de 8 MB não é recomendado. |
| Retenção | **Limits-based com retenção infinita** (`LimitsPolicy` sem `MaxAge`/`MaxBytes`/`MaxMsgs`). **Nunca interest-based**: `InterestPolicy` apaga mensagens sem consumer e após todos os acks; `WorkQueuePolicy` apaga no primeiro ack. Ambas destroem o histórico. |

## Engine de dupla-entrada: comparativo

Dupla-entrada parece simples e não é: idempotência, atomicidade entre contas, saldo que nunca fica negativo, trilha de auditoria. Errar aqui é errar contabilidade — exatamente o que a regra anti-pirâmide existe para impedir. Por isso engine pronto, não hand-rolled.

| | TigerBeetle | Formance Ledger | Midaz (Lerian) |
|---|---|---|---|
| Licença (verificada) | Apache-2.0 | MIT | Elastic-2.0 — source-available, **não** open source OSI |
| Maturidade | 16,2k stars; pré-1.0 (0.17.6); criado 2020 | 1,2k stars; v2.4.9 estável; criado 2021 | 396 stars; v3.7.6; criado 2024; vendor BR |
| Self-host | 1 binário estático, zero dependências; prod recomenda 6 réplicas | Só Postgres; docker-compose all-in-one; prod oficial via operator k8s | Postgres 17 primário + réplica, MongoDB 8, Valkey 8, OTel-LGTM |
| Fit v0.1 | Primitivo débito/crédito mais rápido e seguro; schema binário fixo — metadata mora fora | **Melhor encaixe**: licença MIT, dependência única, transações programáveis (Numscript), API JSON fácil de alimentar por consumer JetStream | Overkill: 4+ dependências de infra; vendor brasileiro é o único plus real |

E por que não blockchain na v0.1:

| Ledger interno event-sourced | Blockchain permissionada |
|---|---|
| Implementação rápida, custo baixo | Complexidade, governança de nós, chaves e custódia |
| Auditoria e queries simples | Migração lenta |
| [LGPD](https://www.gov.br/esporte/pt-br/acesso-a-informacao/lgpd) e controle de acesso nativos | Pouca vantagem se tudo é interno |
| Menor superfície regulatória e DevOps | Risco de parecer "cripto produto" cedo demais |

## Arquitetura em camadas

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

## Eventos

Operacionais (core AGPL):

```text
AssociationCreated, MemberCreated, PatientApproved, PrescriptionRegistered,
CultivationPlanCreated, InputPurchased, BatchCreated, InventoryReceived,
InventoryReserved, InventoryReleased, DispensationRecorded,
QualityCheckPassed, QualityCheckFailed
```

Econômicos (token-ledger):

```text
AccountOpened, CreditIssued, CreditRedeemed, PurchaseOrderCreated,
PurchaseOrderShareIssued, PurchaseOrderShareRedeemed, EscrowLocked, EscrowReleased,
ReputationUpdated, GovernanceRightGranted, VoteCast, FeeCharged,
PaymentReceived, BalanceAdjusted
```

Risco/cobrança:

```text
RiskAssessmentRequested, RiskScoreCalculated, CreditLimitGranted, CreditLimitReduced,
PaymentScheduleCreated, PaymentDue, PaymentLate, CollectionNoticeSent,
PositionBlocked, ProvisionCalculated, DefaultRecorded
```

> **O core operacional emite fatos do mundo. O token-ledger transforma fatos em posições econômicas. O frontend mostra posições em linguagem simples.**

## Modelo lógico de referência

O schema abaixo é **modelo lógico**, não DDL final. A implementação concreta pode delegar `ledger_movement` e `ledger_balance` ao engine escolhido (TigerBeetle ou Formance) e manter no sistema apenas registro de tipos, posições e checkpoints.

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

Tipos financeiros (recebíveis, pools, yield) ficam bloqueados até existir estrutura regulada — substância econômica define valor mobiliário, não o nome ([CVM](https://www.gov.br/cvm/pt-br/acesso-a-informacao-cvm/perguntas-frequentes-da-cvm/criptoativos-quando-se-aplicam-as)).

## Camada de governança

A [economia de contribuição da DAO](/business/dao/) adiciona tabelas ao mesmo ledger:

```text
circle, role, role_assignment                  — estrutura sociocrática
tension, proposal, decision                    — fluxo de governança
contribution_entry, contribution_review,
contribution_token_balance                     — ledger de contribuição (CONTRIB)
governance_right, reputation_score             — direitos e reputação
compensation_pool, compensation_distribution   — compensação futura
```

Referência de modelagem: [Hats Protocol](https://docs.hatsprotocol.xyz/) — papéis como tokens ERC-1155 em árvore, onde o círculo-pai concede e revoga os papéis dos filhos. Mapeia quase literalmente círculos sociocráticos com double-linking. Na v0.1 essa lógica é **espelhada off-chain** como dados no próprio sistema; o protocolo on-chain (core [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.en.html)) fica como destino futuro, não dependência.

## Migração on-chain por adaptador

Quando (e se) on-chain fizer sentido, o ledger interno continua fonte operacional. A chain recebe derivados:

```text
Ledger interno → Checkpoint → Merkle Root → chain pública/permissionada
Ledger interno → Projection API → Frontend (sem mudança alguma)
Ledger interno → Regulated Token Adapter → Receivable / Pool / Settlement Token
                 → parceiro regulado (Resolução BCB 520)
Tesouraria on-chain futura → Safe (multisig battle-tested)
```

Parceiro de liquidação segue a [Resolução BCB 520](https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?numero=520&tipo=Resolu%C3%A7%C3%A3o+BCB) (VASP/SPSAV).

> **Três regras que nunca quebram:** o frontend nunca depende da chain. O usuário nunca depende de wallet. O ledger operacional nunca se mistura com oferta financeira.

## Páginas relacionadas

- [Token-Ledger v0.1](/business/token-ledger/) — o modelo de negócio e os tipos de token visíveis ao usuário
- [DAO & economia de contribuição](/business/dao/) — círculos, papéis, CONTRIB e governança por consentimento
- [Domain Kernel](/architecture/domain-kernel/) — Emmett, decide/evolve, scenario coverage
- [Stack Técnico](/architecture/stack/) — visão completa do stack e deploy
