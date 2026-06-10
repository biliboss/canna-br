---
title: "ADR-003 — Stack Pivot: NATS JetStream + SurrealDB + DBOS"
description: "Migration from PG event store + BullMQ + Drizzle to NATS-backed Emmett + SurrealDB read side + DBOS workflows"
---

# ADR-003 — Stack Pivot: NATS JetStream + SurrealDB + DBOS

| Campo | Valor |
|---|---|
| Status | **Proposed** (2026-06-09) |
| Data | 2026-06-09 |
| Versao | v0.1 |
| Substitui | — |
| Relacionado | [ADR-001 — Domain Kernel + Emmett](/adr/0001-domain-kernel-emmett/), [ADR-002 — MCP-First Surface](/adr/0002-mcp-first-surface/) |

## Contexto

### O que esta errado com o stack atual (PG + BullMQ + Drizzle)

canna-br v0.2.x roda Emmett sobre PostgreSQL como event store, BullMQ sobre Redis para jobs assincronos, e Drizzle ORM para read models em PG. Esta combinacao funciona, mas apresenta tres tensoes crescentes:

**1. Event store PG nao e event bus**

O event store PG do Emmett e transacional e correto para append de streams, mas nao serve como barramento de eventos para fan-out para multiplos consumidores (projecoes, SNGPC adapter, audit log, notificacoes). Hoje isso e simulado via polling ou BullMQ, gerando acoplamento e latencia.

**2. BullMQ nao oferece durabilidade de saga**

SNGPC requer envio de XML assinado com confirmacao. Se o worker Redis cair apos envio mas antes de confirmacao, o estado do saga se perde. BullMQ tem retry, mas nao tem durabilidade de estado de workflow multi-step com compensacao. Bugs nesse ponto sao risco regulatorio direto.

**3. Drizzle read models sao SQL flat — sem graph**

A chain of custody canna-br tem natureza de grafo: `associacao → membro → prescricao → lote → dispensacao → SNGPC`. Queries de auditoria regulatoria cruzam 4-5 joins. Drizzle resolve, mas com impedance mismatch crescente. Graph-native seria mais expressivo para relatorios regulatorios e para o MCP tool `trace_dispensation_chain`.

### O que NATS + SurrealDB + DBOS desbloqueiam

- **NATS JetStream**: event bus persistente com replay, consumer groups, e subject-based routing. Emmett pode publicar eventos para subjects NATS no mesmo append transacional (via outbox pattern ou adapter nativo). Multiplos consumers (projecoes, SNGPC, audit) subscrevem independentemente com acknowledgement.
- **SurrealDB**: banco multi-model (document + graph + relacional) com LIVE queries (websocket push quando dado muda). Read models de graph (trace chain) ficam nativos. MCP tools de consulta eliminam SQL multi-join.
- **DBOS**: runtime de workflows duravais sobre Postgres proprio. Substitui BullMQ para sagas SNGPC e jobs regulatorios. Estado de workflow persistido — crash-safe por design.

### Visao agentica

canna-br como plataforma agentica (ADR-002 MCP-first) se beneficia diretamente: agentes MCP consultam SurrealDB via LIVE query para estado em tempo real, disparam workflows DBOS para acoes regulatorias, e recebem eventos NATS para notificacoes proativas. O stack pivot e pre-requisito para a visao agentica completa.

## Decisao

Migrar os quatro componentes de infraestrutura conforme mapeamento abaixo. O kernel de dominio Emmett (ADR-001) **nao muda** — a decisao e apenas na camada de persistencia e mensageria.

### Mapeamento de componentes

| Componente atual | Responsabilidade | Substituido por | Racional |
|---|---|---|---|
| Emmett PG event store | Append de streams de eventos, optimistic concurrency | **NATS JetStream** via `emmett-nats` adapter | Event bus + store unificado; replay nativo; consumer groups para fan-out |
| BullMQ + Redis | Jobs assincronos, retry, sagas SNGPC | **DBOS Workflows** | Durabilidade de saga crash-safe; estado persistido em Postgres DBOS |
| Drizzle ORM + PG read models | Read models SQL, queries de auditoria | **SurrealDB** | Graph-native para chain of custody; LIVE queries para MCP tools; elimina joins multi-tabela |
| Polling / eventos internos | Fan-out de eventos para multiplos consumers | **NATS subjects** nativos | Subject-based routing; acknowledgement por consumer; replay configuravel |

### Boundary mantido

Emmett **continua como kernel de domain logic** (`packages/event-store`). A interface `EventStore` do Emmett e preservada — apenas a implementacao de backend muda de PG para NATS. `packages/domain` permanece zero-infra, zero-NATS.

### Adapter necessario: `emmett-nats`

Nao existe adapter oficial Emmett → NATS. O escopo de construcao e:

```
packages/emmett-nats/
  src/
    NatsEventStore.ts      # implementa EventStore interface do Emmett
    NatsStreamAppender.ts  # append com optimistic concurrency via sequence number NATS
    NatsProjectionRunner.ts # consumer durable com checkpointing
  tests/
    concurrency.test.ts    # gate: duas dispensacoes concorrentes → apenas uma passa
```

**Mecanismo de optimistic concurrency no NATS**: usar `expectedLastMsgId` ou `expectedLastSeq` na publish do JetStream subject. Se a sequencia esperada nao corresponde, a publish retorna erro — equivalente ao `expectedVersion` do Emmett PG. Isso replica o gate de concorrencia do spike v0.2.0 em NATS.

**Tamanho estimado**: M (medio) — ~3-5 dias de implementacao + testes de concorrencia.

## Matriz de migracao — 12 workspaces (Lane H)

| Workspace | Camada afetada | Esforco | Dependencia bloqueante |
|---|---|---|---|
| `packages/domain` | Nenhuma — zero-infra | — | — |
| `packages/event-store` | Event store backend: PG → NATS | M | `emmett-nats` adapter |
| `packages/read-models` | Schema + queries: Drizzle/PG → SurrealDB | M | SurrealDB schema design |
| `packages/app-services` | Wiring event store + projecoes | M | `emmett-nats` + read-models |
| `apps/mcp-server` | MCP tools: SQL queries → SurrealDB LIVE | P | read-models migrado |
| `apps/api` | Fastify routes: sem mudanca de logica | P | app-services migrado |
| `apps/worker` | BullMQ workers → DBOS workflows | M | DBOS setup |
| `apps/sngpc-adapter` | Saga SNGPC: BullMQ → DBOS | M | apps/worker DBOS |
| `apps/docs` | ADRs, architecture docs | P | — |
| `tooling/vitest` | Test infra: NATS in-memory para testes | P | `emmett-nats` testes |
| `tooling/docker` | Compose: adicionar NATS + SurrealDB, remover Redis | P | — |
| `ops/kamal` | Deploy config: NATS + SurrealDB + DBOS Postgres | P | ADR-004 VPS simulacao |

Legenda: P = pequeno (<1 dia), M = medio (2-5 dias).

**Total estimado**: ~4M + 5P = ~15-20 dias de implementacao efetiva com subagentes paralelos.

## Consequencias

### Positivas

- **Sagas SNGPC crash-safe**: DBOS garante que cada step do workflow de envio SNGPC e atomico e reiniciavel. Regulatorio sem risco de estado perdido.
- **Graph queries nativas**: `trace_dispensation_chain` MCP tool vira query SurrealDB de 3 linhas em vez de 5 joins SQL. Auditoria regulatoria expressiva.
- **LIVE updates para agentes MCP**: SurrealDB LIVE query envia push websocket quando lote ou quota muda — agentes podem reagir proativamente sem polling.
- **Fan-out desacoplado**: projecoes, SNGPC, audit log subscrevem NATS independentemente. Falha de projecao nao afeta o fluxo principal de dispensacao.
- **Event replay**: NATS JetStream permite replay de eventos a partir de qualquer sequencia — util para rebuild de read models e debugging regulatorio.
- **Fleet agentica**: base para multi-tenant SaaS com multiplas associacoes como consumers NATS independentes.

### Negativas e riscos

**Risco 1 (alto): Optimistic concurrency em NATS e mais complexa**

O mecanismo `expectedLastSeq` do JetStream e menos ergonomico que o `expectedVersion` do Emmett PG. Testes de concorrencia com subjects de alta contenção precisam ser validados antes do spike gate. Se o adapter nao reprovar o gate de concorrencia (duas dispensacoes concorrentes → apenas uma passa), a migracao nao avanča.

**Risco 2 (medio): DBOS requer Postgres proprio**

DBOS nao compartilha Postgres com a aplicacao — precisa de instancia dedicada para seu estado interno. Na VPS atual (62.171.145.76) ja saturada com Langfuse + SurrealDB + NATS, somar ~300MB+ de Postgres DBOS nao e viavel sem nova VPS. Bloqueante para simulacao em prod — ver ADR-004.

**Risco 3 (medio): Ordenacao de projecoes para acumuladores**

`MemberQuotaConsumed` e `LotQuantityDeducted` sao projecoes acumuladoras — a ordenacao de processamento importa para consistencia. NATS JetStream garante ordenacao por subject, mas o `NatsProjectionRunner` precisa implementar checkpointing correto para evitar duplo-processamento em restart. Requer teste de chaos (kill worker mid-projection).

**Custo de migracao**: ~4M + 5P por workspace conforme matriz acima. Nenhum workspace e big-bang — cada um migra independentemente com feature flag.

### Invariante preservada

O kernel de dominio (ADR-001) permanece intocado. A chain of custody regulatoria — append de `DispensationRecorded + MemberQuotaConsumed + LotQuantityDeducted` em UM append atomico — e preservada independente do backend de event store.

## Build necessario

### `emmett-nats` adapter (escopo M)

Nenhum adapter Emmett → NATS JetStream existe publicamente em junho de 2026. Este e o item de maior risco tecnico da migracao.

Gate de acceptacao do adapter:

```
DADO: dois comandos RecordDispensation concorrentes para o mesmo stream
QUANDO: ambos tentam append simultaneamente
ENTAO: apenas um passa com expectedLastSeq correto
  E: o segundo recebe erro de concorrencia
  E: o segundo e reavaliado contra estado atualizado
  E: se estoque insuficiente, emite LotInsufficientQuantity
  E: o estoque nunca fica negativo
```

Se este gate nao passar, esta ADR vai para _Superseded_ por solucao alternativa.

## Alternativa considerada

### Manter PG + BullMQ + Drizzle

**Prós**: sem risco de migracao, stack maduro, Emmett PG ja validado em spike v0.2.0, menos VPS.

**Contras**: nao resolve o problema de sagas SNGPC crash-safe, nao habilita graph queries para auditoria, nao e event bus para arquitetura agentica multi-consumer. O stack atual e correto para MVP de associacao unica mas nao escala para a visao multi-tenant agentica.

**Decisao**: alternativa aceitavel como fallback se `emmett-nats` nao passar o gate de concorrencia. Nesse caso, revisitar DBOS apenas para sagas (sobre PG existente) e Drizzle mantido.

## Referencias

- ADR-001 — Domain Kernel + Emmett: `/adr/0001-domain-kernel-emmett/`
- ADR-002 — MCP-First Surface: `/adr/0002-mcp-first-surface/`
- ADR-004 — Simulacao em VPS Dedicada: `/adr/0004-simulation-vps/`
- ops-stack/references/surrealdb-patterns — patterns SurrealDB fonsecagabriel
- ops-stack/references/nats-patterns — patterns NATS fonsecagabriel
- ops-stack/references/surrealdb-instance — instancia SurrealDB 62.171.145.76
- ops-stack/references/nats-instance — instancia NATS 62.171.145.76
- Lane H mapping report — mapeamento completo dos 12 workspaces (contexto coordenador)
- Lane G license audit — auditoria de licencas (contexto coordenador)
- NATS JetStream docs — https://docs.nats.io/nats-concepts/jetstream
- DBOS docs — https://docs.dbos.dev
- SurrealDB LIVE queries — https://surrealdb.com/docs/surrealql/statements/live
