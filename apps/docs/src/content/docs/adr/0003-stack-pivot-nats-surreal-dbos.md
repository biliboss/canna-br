---
title: "ADR-003 — Event Store: SurrealDB na Infra Compartilhada"
description: "Event store v0.1.0 = adapter SurrealDB (es_stream/es_event + optimistic concurrency) atras do port CannaEventStore, na instancia viva do manager. NATS bus so em v0.2. DBOS e VPS dedicada fora do escopo."
---

# ADR-003 — Event Store: SurrealDB na Infra Compartilhada

| Campo | Valor |
|---|---|
| Status | **Accepted** (2026-06-11) |
| Versao | v0.1.0 |
| Substitui | [ADR-001 — Domain Kernel + Emmett](/adr/0001-domain-kernel-emmett/) (camada de store) |
| Relacionado | [ADR-001 — Domain Kernel + Emmett](/adr/0001-domain-kernel-emmett/), [ADR-002 — MCP-First Surface](/adr/0002-mcp-first-surface/) |

## Contexto

v0.1.0 e a primeira fatia usavel (operador pre-provisiona uma associacao → onboarding de primeiro acesso → login multi-tenant → operacao basica: cadastrar membro, ver dashboard). Essa fatia precisa de um **event store** append-only por stream e de **multi-tenant** — sem provisionar nenhuma infra nova.

O **manager** ja roda uma instancia SurrealDB no ar com o pattern `es_stream`/`es_event` + optimistic concurrency (via `ExpectedVersionConflictError` do Emmett) — esse padrao esta **provado em producao hoje** no codebase do manager (`infra/surreal/eventstore.ts`). A oportunidade obvia: reaproveitar essa infra e esse pattern em vez de subir Postgres/Redis/NATS dedicados so para ligar a primeira fatia.

A versao anterior desta ADR decidia o oposto (NATS como event store via adapter `emmett-nats`, DBOS para sagas, SurrealDB so como read-model, VPS nova obrigatoria). Esse enquadramento esta **superseded** — v0.1.0 nao tem consumidor async e nao justifica nada disso.

## Decisao

O kernel de dominio Emmett (ADR-001) **nao muda**. So o backend do store muda. Mapeamento claro:

### Event store = SurrealDB

O event store de v0.1.0 e um **adapter SurrealDB** (`es_stream`/`es_event`) atras do port `CannaEventStore`, rodando em `ns=canna` na **instancia interna viva do manager**. Optimistic concurrency continua via `ExpectedVersionConflictError` do Emmett.

O adapter e uma **copia do `infra/surreal/eventstore.ts` do manager** — onde o pattern ja roda em producao. O adapter Surreal do canna em si ainda esta **PLANEJADO** (a construir a partir desse arquivo), nao construido.

### Message bus = NATS JetStream — so em v0.2

NATS entra **somente em v0.2** como barramento de distribuicao: submissao SNGPC assincrona, notificacoes, policies cross-context, fan-out/federacao. **v0.1.0 nao tem consumidor async** — cadastrar membro + ver dashboard e sincrono, via SurrealDB LIVE SELECT.

A distincao que importa:

> **event store** (SurrealDB · verdade append-only por stream) **≠ message bus** (NATS · distribuicao).

### DBOS — fora do v0.1.0

O workflow engine DBOS sai do escopo de v0.1.0. Reavaliar em v0.2 **se** a durabilidade da saga SNGPC exigir — provavelmente o durable consumer do NATS JetStream cobre o caso sem somar um Postgres dedicado.

### Self-host = Emmett/Postgres (dual model)

O caminho de **self-host** usa o adapter Postgres do Emmett. O **managed** (oferta gerenciada) ride o SurrealDB do manager. Mesmo dominio, dois backends de store.

### Infra nova / VPS dedicada — nao necessaria

A VPS dedicada do antigo ADR-004 **nao e necessaria para v0.1.0** — a fatia ride a infra viva (zero infra nova). Reavaliar isolamento dedicado apenas quando dados de saude reais exigirem (v0.2+).

## Consequencias

### Positivas

- **Zero infra nova**: v0.1.0 ride a instancia interna ja no ar do manager — sem Postgres/Redis/NATS/VPS adicionais.
- **Store provado**: o pattern `es_stream`/`es_event` + `ExpectedVersionConflictError` ja roda em producao no manager. Risco tecnico baixo.
- **SurrealDB multi-model**: colapsa document + graph + vector + KV num unico backend — sem somar bancos especializados.
- **CHANGEFEED para trilha LGPD**: feed de mudancas nativo serve trilha de auditoria/consentimento sem pipeline extra.
- **LIVE SELECT para read-models sem bus**: dashboard e leituras reagem em tempo real sem precisar de message bus em v0.1.0.
- **Chain-of-custody graph-native**: `associacao → membro → ...` modela como grafo nativo, expressivo para auditoria regulatoria futura.

### Negativas e riscos

- **Licenca BSL 1.1 (nao-OSS no core)**: SurrealDB no core e Business Source License 1.1, nao OSS. Por isso o **self-host usa Postgres** (Emmett) — o managed assume o SurrealDB.
- **Isolamento por namespace precisa validacao**: a separacao multi-tenant por `ns=canna` precisa de validacao cross-tenant explicita antes de confiar nela como boundary.
- **Adapter Surreal ainda a construir**: o adapter do canna e copia planejada do `eventstore.ts` do manager — provado la, mas ainda nao escrito aqui.

### Invariante preservada

O dominio Emmett (ADR-001) permanece **intocado**. `packages/domain` continua **zero-infra**. So o backend do store muda — a interface do event store e o append atomico da chain of custody nao mudam.

## Referencias

- ADR-001 — Domain Kernel + Emmett: `/adr/0001-domain-kernel-emmett/`
- ADR-002 — MCP-First Surface: `/adr/0002-mcp-first-surface/`
- ops-stack/references/surrealdb-patterns — patterns SurrealDB (instancia interna do manager)
- ops-stack/references/nats-patterns — patterns NATS (instancia interna do manager)
- SurrealDB LIVE queries — https://surrealdb.com/docs/surrealql/statements/live
- NATS JetStream docs — https://docs.nats.io/nats-concepts/jetstream
