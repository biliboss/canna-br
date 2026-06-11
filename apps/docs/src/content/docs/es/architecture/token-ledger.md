---
title: "Token-Ledger (arquitectura)"
description: "JetStream como log de eventos inmutable, engine de doble entrada listo (TigerBeetle o Formance), proyecciones en SurrealDB. 100% off-chain en v0.1; on-chain por adaptador."
---

> **Decisión de stack: 100% off-chain en la v0.1.** NATS JetStream es el log de eventos inmutable — la fuente de la verdad. El ledger de doble entrada es un engine **listo** (TigerBeetle o Formance): débito, crédito y saldo no se reimplementan. SurrealDB guarda proyecciones y read-models. On-chain entra después, como adaptador — nunca como reescritura.

Esta página es la contraparte técnica del [Token-Ledger v0.1](/es/business/token-ledger/). No cambia nada en el stack existente: el dominio sigue en el [Domain Kernel Emmett](/es/architecture/domain-kernel/) y la infraestructura sigue el pivot NATS + SurrealDB del [ADR-003](/es/adr/0003-stack-pivot-nats-surreal-dbos/).

## JetStream como event store

JetStream funciona como event store append-only — con dos salvedades operacionales, verificadas en la doc oficial:

| Salvedad | Regla |
|---|---|
| Tamaño de mensaje | `max_payload` por defecto es **1 MiB**. Los eventos deben ser pequeños. Subir el límite (máx. 64 MB) es una decisión deliberada; por encima de 8 MB no se recomienda. |
| Retención | **Limits-based con retención infinita** (`LimitsPolicy` sin `MaxAge`/`MaxBytes`/`MaxMsgs`). **Nunca interest-based**: `InterestPolicy` borra mensajes sin consumer y después de todos los acks; `WorkQueuePolicy` borra en el primer ack. Ambas destruyen el historial. |

## Engine de doble entrada: comparativo

La doble entrada parece simple y no lo es: idempotencia, atomicidad entre cuentas, saldo que nunca queda negativo, trazabilidad de auditoría. Equivocarse aquí es equivocarse en contabilidad — exactamente lo que la regla anti-pirámide existe para impedir. Por eso engine listo, no hand-rolled.

| | TigerBeetle | Formance Ledger | Midaz (Lerian) |
|---|---|---|---|
| Licencia (verificada) | Apache-2.0 | MIT | Elastic-2.0 — source-available, **no** open source OSI |
| Madurez | 16,2k stars; pre-1.0 (0.17.6); creado en 2020 | 1,2k stars; v2.4.9 estable; creado en 2021 | 396 stars; v3.7.6; creado en 2024; vendor BR |
| Self-host | 1 binario estático, cero dependencias; prod recomienda 6 réplicas | Solo Postgres; docker-compose all-in-one; prod oficial vía operator k8s | Postgres 17 primario + réplica, MongoDB 8, Valkey 8, OTel-LGTM |
| Fit v0.1 | Primitivo débito/crédito más rápido y seguro; schema binario fijo — la metadata vive fuera | **Mejor encaje**: licencia MIT, dependencia única, transacciones programables (Numscript), API JSON fácil de alimentar por consumer JetStream | Overkill: 4+ dependencias de infra; el vendor brasileño es el único plus real |

Y por qué no blockchain en la v0.1:

| Ledger interno event-sourced | Blockchain permisionada |
|---|---|
| Implementación rápida, costo bajo | Complejidad, gobernanza de nodos, claves y custodia |
| Auditoría y queries simples | Migración lenta |
| [LGPD](https://www.gov.br/esporte/pt-br/acesso-a-informacao/lgpd) y control de acceso nativos | Poca ventaja si todo es interno |
| Menor superficie regulatoria y DevOps | Riesgo de parecer "cripto producto" demasiado pronto |

## Arquitectura en capas

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

Operacionales (core AGPL):

```text
AssociationCreated, MemberCreated, PatientApproved, PrescriptionRegistered,
CultivationPlanCreated, InputPurchased, BatchCreated, InventoryReceived,
InventoryReserved, InventoryReleased, DispensationRecorded,
QualityCheckPassed, QualityCheckFailed
```

Económicos (token-ledger):

```text
AccountOpened, CreditIssued, CreditRedeemed, PurchaseOrderCreated,
PurchaseOrderShareIssued, PurchaseOrderShareRedeemed, EscrowLocked, EscrowReleased,
ReputationUpdated, GovernanceRightGranted, VoteCast, FeeCharged,
PaymentReceived, BalanceAdjusted
```

Riesgo/cobranza:

```text
RiskAssessmentRequested, RiskScoreCalculated, CreditLimitGranted, CreditLimitReduced,
PaymentScheduleCreated, PaymentDue, PaymentLate, CollectionNoticeSent,
PositionBlocked, ProvisionCalculated, DefaultRecorded
```

> **El core operacional emite hechos del mundo. El token-ledger transforma hechos en posiciones económicas. El frontend muestra posiciones en lenguaje simple.**

## Modelo lógico de referencia

El schema de abajo es un **modelo lógico**, no DDL final. La implementación concreta puede delegar `ledger_movement` y `ledger_balance` al engine elegido (TigerBeetle o Formance) y mantener en el sistema solo el registro de tipos, posiciones y checkpoints.

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

Los tipos financieros (créditos por cobrar, pools, yield) quedan bloqueados hasta que exista estructura regulada — la sustancia económica define el valor mobiliario, no el nombre ([CVM](https://www.gov.br/cvm/pt-br/acesso-a-informacao-cvm/perguntas-frequentes-da-cvm/criptoativos-quando-se-aplicam-as)).

## Capa de gobernanza

La [economía de contribución de la DAO](/es/business/dao/) agrega tablas al mismo ledger:

```text
circle, role, role_assignment                  — estrutura sociocrática
tension, proposal, decision                    — fluxo de governança
contribution_entry, contribution_review,
contribution_token_balance                     — ledger de contribuição (CONTRIB)
governance_right, reputation_score             — direitos e reputação
compensation_pool, compensation_distribution   — compensação futura
```

Referencia de modelado: [Hats Protocol](https://docs.hatsprotocol.xyz/) — roles como tokens ERC-1155 en árbol, donde el círculo padre concede y revoca los roles de los hijos. Mapea casi literalmente círculos sociocráticos con double-linking. En la v0.1 esa lógica se **espeja off-chain** como datos en el propio sistema; el protocolo on-chain (core [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.en.html)) queda como destino futuro, no como dependencia.

## Migración on-chain por adaptador

Cuando (y si) on-chain tenga sentido, el ledger interno sigue siendo la fuente operacional. La chain recibe derivados:

```text
Ledger interno → Checkpoint → Merkle Root → chain pública/permissionada
Ledger interno → Projection API → Frontend (sem mudança alguma)
Ledger interno → Regulated Token Adapter → Receivable / Pool / Settlement Token
                 → parceiro regulado (Resolução BCB 520)
Tesouraria on-chain futura → Safe (multisig battle-tested)
```

El socio de liquidación sigue la [Resolución BCB 520](https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?numero=520&tipo=Resolu%C3%A7%C3%A3o+BCB) (VASP/SPSAV).

> **Tres reglas que nunca se rompen:** el frontend nunca depende de la chain. El usuario nunca depende de wallet. El ledger operacional nunca se mezcla con oferta financiera.

## Páginas relacionadas

- [Token-Ledger v0.1](/es/business/token-ledger/) — el modelo de negocio y los tipos de token visibles para el usuario
- [DAO & economía de contribución](/es/business/dao/) — círculos, roles, CONTRIB y gobernanza por consentimiento
- [Domain Kernel](/es/architecture/domain-kernel/) — Emmett, decide/evolve, scenario coverage
- [Stack Técnico](/es/architecture/stack/) — visión completa del stack y deploy

---

> **Traducción automática v1** — versión en español generada por LLM, pulido humano en curso. Reporta errores a gabriel@devmagic.com.br.
