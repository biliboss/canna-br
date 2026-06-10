---
title: "Domain Kernel — Event Sourcing com Emmett"
description: "Domínio executável primeiro. Emmett (event-driven-io) como event-sourcing kernel; tudo o mais raw. decide/evolve + scenario coverage em vitest."
---

# Domain Kernel

> **Tese:** domínio puro primeiro, Emmett como kernel de Event Sourcing, **raw para todo o resto**.

O canna-oss é um sistema de domínio regulado. Bug de domínio = risco jurídico para a associação. A arquitetura espelha esse fato: o **kernel de domínio** é a primeira coisa a ser escrita, em TypeScript puro, com testes GIVEN/WHEN/THEN cobrindo cada cenário de cada comando — antes de qualquer banco, antes de qualquer HTTP route, antes de qualquer UI.

[Emmett (event-driven-io/emmett)](https://github.com/event-driven-io/emmett) entra como biblioteca de Event Sourcing — não como framework da aplicação. Ele fornece event store (Postgres, in-memory), command handler, optimistic concurrency e test harness. O resto — Fastify, Drizzle (para read models), BullMQ, MinIO — fica raw.

## Princípio Operacional

```text
Raw application architecture
+ Emmett as event-sourcing kernel
```

| Emmett controla | Raw / explícito |
|---|---|
| Event store (Postgres + in-memory) | HTTP routing (Fastify) |
| Command handler abstraction | Auth / RBAC |
| Optimistic concurrency | LGPD crypto |
| Stream loading / appending | PDF generation |
| Test harness GIVEN/WHEN/THEN | SNGPC adapter |
| Projection support | Database schema (Drizzle) |
|  | Multi-tenant |

## decide / evolve

Cada aggregate é uma dupla de funções puras:

```typescript
type Decide<Command, State, Event> = (cmd: Command, state: State) => Event[];
type Evolve<State, Event> = (state: State, event: Event) => State;
```

Não há classes. Não há ORM. Não há side effect. O domínio é uma função.

```text
GIVEN  MemberRegistered, PrescriptionValidated, QuotaUpdated(30g)
WHEN   RecordDispensation(25g)
THEN   DispensationRecorded

GIVEN  MemberRegistered, PrescriptionValidated, QuotaUpdated(30g),
       DispensationRecorded(10g)
WHEN   RecordDispensation(25g)
THEN   QuotaExceededAttempt
```

Esses são os testes. Eles são o domínio.

## Layout de Pacotes

```text
canna-oss/
├── packages/
│   ├── domain/                          ← TypeScript puro, zero dependências externas
│   │   ├── src/
│   │   │   ├── membership/
│   │   │   │   ├── commands.ts
│   │   │   │   ├── events.ts
│   │   │   │   ├── state.ts
│   │   │   │   ├── decide.ts
│   │   │   │   ├── evolve.ts
│   │   │   │   └── scenarios.spec.ts
│   │   │   ├── inventory/
│   │   │   │   └── …
│   │   │   ├── dispensation/
│   │   │   │   └── …
│   │   │   ├── compliance/
│   │   │   │   └── …
│   │   │   └── shared/
│   │   │       ├── ids.ts               ← ULID factories
│   │   │       ├── errors.ts            ← DomainError, RejectedCommand
│   │   │       ├── result.ts            ← Result<E, A>
│   │   │       ├── event.ts             ← Event<Type, Payload> com versão
│   │   │       └── clock.ts             ← injeção de tempo para testes
│   │   └── package.json
│   │
│   ├── event-store/                     ← Emmett wiring
│   │   ├── src/
│   │   │   ├── in-memory.ts             ← Emmett in-memory para dev/test
│   │   │   └── postgres.ts              ← Emmett PostgreSQL event store
│   │   └── package.json
│   │
│   ├── app-services/                    ← orquestração: carrega stream, decide, append
│   │   ├── src/
│   │   │   ├── register-member.ts
│   │   │   ├── validate-prescription.ts
│   │   │   ├── release-lot.ts
│   │   │   ├── record-dispensation.ts
│   │   │   └── …
│   │   └── package.json
│   │
│   └── read-models/                     ← Drizzle + SQL explícito
│       ├── src/
│       │   ├── schema.ts
│       │   └── projections/
│       │       ├── member-list.ts
│       │       ├── dispensation-history.ts
│       │       └── inventory-summary.ts
│       └── package.json
│
└── apps/
    ├── api/                             ← Fastify endpoints finos
    │   └── src/
    │       └── routes/
    └── worker/                          ← BullMQ workers
        └── src/
            ├── projections/
            ├── sngpc/
            └── reports/
```

`packages/domain` é o núcleo. Tudo o mais depende dele; ele não depende de nada.

## Workflow Obrigatório

Para qualquer mudança de comportamento de domínio, **a ordem é fixa**:

1. Adicionar ou atualizar o tipo de Command/Event/State
2. Adicionar testes GIVEN/WHEN/THEN para todos os cenários (success + rejection + state transition + event payload)
3. Implementar `evolve()` para os eventos novos
4. Implementar `decide()` para o comando
5. Rodar `pnpm test:domain` — todos os cenários verdes
6. **Só então** atualizar app-services, read models ou API

Não há "primeiro a tabela, depois o teste". Não há "primeiro o endpoint, depois o domínio". Inversão dessa ordem é regressão de arquitetura.

## Scenario Coverage

Cobertura de linha é teatro. O que importa é **Domain Scenario Coverage**:

```text
100% dos commands têm teste de sucesso
100% dos commands têm pelo menos um cenário de rejeição
100% dos invariants têm teste
100% das transições de estado têm teste
100% dos eventos têm schema + version assertada
100% dos erros de domínio esperados têm teste
```

Exemplo para `RecordDispensation`:

| Cenário | Resultado esperado |
|---|---|
| membro ativo, quota suficiente, lote disponível, role DISPENSADOR | `DispensationRecorded` |
| membro suspenso | `DispensationRejected(reason=MEMBER_SUSPENDED)` |
| prescrição expirada | `DispensationRejected(reason=PRESCRIPTION_EXPIRED)` |
| quota excedida | `QuotaExceededAttempt` |
| lote em quarentena | `DispensationRejected(reason=LOT_QUARANTINED)` |
| lote recalled | `DispensationRejected(reason=LOT_RECALLED)` |
| quantidade ≤ 0 | `DomainError` (validação) |
| usuário sem role DISPENSADOR | `DispensationRejected(reason=ROLE_INSUFFICIENT)` |

Cada linha = um teste GIVEN/WHEN/THEN explícito.

## Ordem de Implementação

A ordem abaixo é projetada para Claude Code — feedback rápido, ciclo fechado, dependências mínimas.

### Passo 1 — Workspace + Domain Vazio

```text
pnpm init
pnpm add -D vitest typescript @types/node @vitest/coverage-v8
tsconfig strict + project references
packages/domain inicializado em workspace pnpm
```

Scripts em `package.json` da raiz:

```text
pnpm verify        ← typecheck + test:domain + lint
pnpm test:domain   ← vitest run packages/domain
pnpm test:watch    ← vitest packages/domain
pnpm coverage      ← vitest run --coverage packages/domain
pnpm typecheck     ← tsc --noEmit
```

### Passo 2 — Membership Aggregate

Eventos mínimos:

```text
MemberRegistered
ConsentGranted
ConsentRevoked
PrescriptionValidated
QuotaUpdated
MemberSuspended
MemberReinstated
MemberAnonymized
```

Sem banco. Sem Emmett. TypeScript puro + vitest.

### Passo 3 — InventoryLot Aggregate

```text
LotCreated
LotQuarantined
LotReleased
LotRecalled
LotExhausted
```

### Passo 4 — Dispensation Use Case

Dispensation cruza Member + InventoryLot. **Não é um aggregate gigante.** É um **use case**:

```text
RecordDispensation use case
  carrega Member state
  carrega InventoryLot state
  valida quota / status / lote / role
  emite DispensationRecorded
       ou DispensationRejected
       ou QuotaExceededAttempt
```

Ainda sem banco. Use case roda contra event arrays em memória.

### Passo 5 — Emmett In-Memory Event Store

Primeira aparição do Emmett. Substitui o array de eventos por um event store real (in-memory) com optimistic concurrency.

### Passo 6 — Emmett PostgreSQL Event Store

Único passo que requer banco. Migração trivial: troca-se o adapter.

### Passo 7 — Read Models (Drizzle)

Projections gravando em tabelas Drizzle a partir dos eventos. Read models existem para queries — nunca para regras de negócio.

### Passo 8 — Fastify Endpoint

Endpoint fino. Recebe HTTP, valida com Zod, chama app-service, retorna. **Zero regra de negócio na camada HTTP.**

### Passo 9 — Worker BullMQ

Side effects assíncronos: emissão de PDF, submissão SNGPC, geração de BSPO.

## Por Que Esse Caminho

**Claude Code performa melhor com ciclo fechado de verificação.** A doc oficial da Anthropic recomenda dar ao agente forma objetiva de checar trabalho (testes, build, lint, fixtures). O domain kernel **é** essa máquina de feedback rápido:

```text
Claude Code propõe alteração
  → altera decide/evolve
  → roda pnpm test:domain
  → falha
  → corrige
  → passa
```

Cada iteração leva segundos, não minutos. Sem banco, sem servidor, sem mock complexo. O domínio é função pura — função pura é a coisa mais testável que existe.

## Onde Emmett Termina

Emmett **não controla**:

- HTTP routing — Fastify cru
- Auth / RBAC — TypeScript + Postgres direto
- LGPD crypto — Web Crypto API + Vault
- PDF generation — Puppeteer
- SNGPC adapter — XML + fetch + XSD validation
- Database schema das tabelas de read model — Drizzle
- Multi-tenant isolation — RLS PostgreSQL

A regra mental: **se você consegue imaginar trocar Emmett por outra biblioteca de Event Sourcing sem reescrever o domínio, a arquitetura está certa.** Domínio é puro; Emmett é encanamento.

## Critério de Sucesso do Spike

Antes de comprometer Emmett como decisão definitiva, fazer **spike** com este escopo:

```text
1. MemberRegistered
2. PrescriptionValidated
3. LotManuallyCreated
4. DispensationRecorded
5. QuotaExceededAttempt
```

Critério:

```text
Conseguimos fazer o core loop:
GIVEN events → command → domain event → append PostgreSQL → projection → relatório simples

Se Claude Code consegue navegar, testar e evoluir esse spike sem se perder,
Emmett vira peça oficial da stack.
Caso contrário, fica com event-sourcing in-house e revisita.
```

## Premissas

Esta arquitetura assume:

- Event Sourcing é o modelo certo para domínio regulado com chain of custody (alta confiança — chain of custody **é** event-sourced por natureza)
- Emmett é estável o suficiente para produção em domínio regulado (média confiança — fazer spike antes de comprometer)
- Postgres event store do Emmett suporta volume de associação típico (alta confiança — volume é baixo: ~1k eventos/dia/associação)

Cf. [Premissas Regulatórias](/regulatory-assumptions/) para o framework geral de tracking de apostas.
