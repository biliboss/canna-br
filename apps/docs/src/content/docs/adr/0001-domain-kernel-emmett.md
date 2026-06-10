---
title: "ADR-001 — Domain Kernel com Emmett"
description: "Decisão arquitetural: TypeScript puro para domínio + Emmett como event-sourcing kernel + raw para o resto. Status: Accepted (com spike gate)."
---

# ADR-001 — Domain Kernel com Emmett

| Campo | Valor |
|---|---|
| Status | **Accepted** (spike gate v0.2.0a + v0.2.0b PASSED, 99+ tests green em PG real) |
| Data | 2026-06-08 |
| Versão | v0.2 |
| Substitui | — |
| Camada interface substituída por | [ADR-002 — MCP-First Surface](/adr/0002-mcp-first-surface/) (camada domínio + event-sourcing **mantida** — esta ADR ainda canonical para Emmett + decide/evolve + sync vs async boundary) |

## Contexto

canna-oss é um sistema de domínio regulado (RDC 1.014/2026 sandbox + LGPD dados sensíveis de saúde). Bug de domínio = risco jurídico direto para a diretoria da associação. A chain of custody (planta → colheita → lote → dispensação → SNGPC) é naturalmente event-sourced: cada transição é um evento imutável que vira evidência regulatória.

Três opções para event sourcing foram avaliadas:

1. **Hand-rolled** — escrever event store + command handler + concurrency control internamente
2. **Framework completo** — adotar framework opinionated que controle HTTP, DB, eventos (NestJS + module event sourcing, ou similar)
3. **Library + raw** — usar biblioteca de event sourcing como **kernel** (event store, decide/evolve harness, concurrency) e manter HTTP/auth/integração externa raw

A decisão também precisa otimizar para **Claude Code como colaborador primário** de implementação — feedback rápido, ciclo fechado de verificação, regras explícitas em vez de convenções implícitas de framework.

## Decisão

**Opção 3.** Domínio em TypeScript puro (`packages/domain`), [Emmett (event-driven-io)](https://github.com/event-driven-io/emmett) como event-sourcing kernel, raw para todo o resto.

### Boundary

Emmett **possui**:

- Event store (PostgreSQL + in-memory)
- Command handler abstraction
- Optimistic concurrency
- Stream loading / appending
- Test harness GIVEN/WHEN/THEN
- Projection support

Emmett **não possui**:

- HTTP routing (Fastify cru)
- Auth / RBAC (TypeScript + Postgres direto)
- LGPD crypto (Web Crypto API + Vault)
- PDF generation (Puppeteer)
- SNGPC adapter (XML + fetch + XSD)
- Schema das tabelas de read model (Drizzle)
- Multi-tenant isolation (RLS PostgreSQL)

### Regra Mental

> Se não dá para imaginar trocar Emmett por outra biblioteca de event sourcing sem reescrever o domínio, a arquitetura está errada.

`packages/domain` depende apenas de `typescript` e tipos primitivos. **Zero import de Emmett dentro do domínio.** Emmett aparece somente em `packages/event-store` e `packages/app-services`.

### Sync vs Async

Decisão complementar crítica: **estado regulatório crítico é síncrono/transacional; integração externa é assíncrona.**

`RecordDispensation` `decide()` retorna em UM append no event store:

- `DispensationRecorded`
- `MemberQuotaConsumed`
- `LotQuantityDeducted`

Optimistic concurrency do Emmett garante consistência sem 2PC. Side effects externos (SNGPC XML, PDF, email) vão para BullMQ — **falha de SNGPC não pode invalidar dispensação já registrada**. Audit log é projeção dos eventos, não job assíncrono.

## Consequências

### Positivas

- **Feedback rápido**: `pnpm test:domain` em segundos. Domínio puro = função pura = máxima testabilidade. Claude Code pode iterar `decide`/`evolve` sem subir banco ou servidor.
- **Auditabilidade jurídica**: cada decisão de domínio é uma função pura testada com cenário explícito. O domínio **é** o teste.
- **Portabilidade**: domínio independe de Emmett. Se a biblioteca morrer ou divergir, o kernel é substituível sem tocar regras de negócio.
- **Chain of custody natural**: event sourcing já é a forma correta de representar trace plant → harvest → lot → dispensation. Não há impedance mismatch.
- **Sync regulatório garantido**: append atômico de Dispensation + Quota + Lot elimina classe inteira de bugs onde dispensação fica registrada mas estoque/quota ficam dessincronizados.

### Negativas

- **Curva de aprendizado**: event sourcing tem mais ergonomia do que ORM clássico. Onboarding de devs novos exige conceitos de `decide`/`evolve`/stream/projection.
- **Risco de biblioteca**: Emmett é um projeto novo (2024+) comparado a EventStoreDB ou Akka. Mitigação: spike gate (ver abaixo) + boundary estrito (raw para tudo fora do kernel).
- **Read models exigem projeção**: queries não rodam direto no event store. Drizzle entra para read models, com projections rebuildáveis a partir dos eventos.
- **Sem rollback de evento**: imutabilidade significa que correção exige evento compensatório, não UPDATE. Em compliance isso é feature, mas exige mentalidade diferente.

## Spike Gate (Critério de Confirmação)

Esta decisão é **Accepted with spike gate**. Antes de comprometer Emmett como definitivo, fazer spike v0.2.0 com escopo:

```text
Eventos:  MemberRegistered, PrescriptionValidated, LotManuallyCreated,
          DispensationRecorded + MemberQuotaConsumed + LotQuantityDeducted (mesmo append),
          QuotaExceededAttempt, LotInsufficientQuantity

Core loop: GIVEN events → command → decide() → append em Emmett Postgres
           → projection → relatório simples (vitest assertion sobre projeção)
```

**Testes obrigatórios para o spike passar:**

| Cenário | Resultado esperado |
|---|---|
| Membro ativo + quota suficiente + lote disponível | `DispensationRecorded` + `MemberQuotaConsumed` + `LotQuantityDeducted` em UM append |
| Quota excedida | `QuotaExceededAttempt` — sem mutação de estoque |
| Lote insuficiente | `LotInsufficientQuantity` — sem mutação de quota |
| Membro suspenso | rejeição domain — nenhum evento emitido |
| Prescrição expirada | rejeição domain |
| Role inválida (`!= DISPENSADOR`) | rejeição domain |
| **Duas `RecordDispensation` concorrentes no mesmo lote** | **Apenas uma passa.** A segunda falha por optimistic concurrency, é reavaliada contra o estado novo e emite `LotInsufficientQuantity` se estoque insuficiente — **nunca deixa estoque negativo**. |
| Crash entre command recebido e append | Sem evento parcial — ou todos os 3 eventos foram persistidos ou nenhum |

**Critério qualitativo:** Claude Code navega, testa e evolui o spike sem confusão. `pnpm test:domain < 5s`.

### Decisão de Stream (v0.2 simplification)

Para o spike, `RecordDispensation` usa um **stream serializado por associação**:

```text
stream: association:{associationId}:dispensations
```

Todos os `RecordDispensation` de uma associação passam por **um único stream** de controle. Optimistic concurrency no `expectedVersion` desse stream garante serialização linear de dispensações dentro da associação.

Os 3 eventos (`DispensationRecorded` + `MemberQuotaConsumed` + `LotQuantityDeducted`) são appendados juntos nesse stream. Read models de quota e estoque projetam a partir dele.

**Por quê serializar por associação, não por lote:**
- Throughput de uma associação é baixo (~1k eventos/dia). Serialização linear não é gargalo.
- Evita race condition de duas dispensações concorrentes contra o mesmo lote — ambas avaliariam estado stale.
- Mais simples que process manager cross-stream ou advisory locks PostgreSQL.
- Segurança regulatória > pureza de aggregate-per-stream.

**Trade-off conhecido:** não escala para milhares de dispensações/segundo por associação. Para v0.2 isso é irrelevante — volume real é dezenas de dispensações/dia. **Decisão revisitada em ADR futuro** quando alguma associação encostar no limite ou quando multi-tenant exigir reformulação:

- Streams por aggregate (lot stream, member-month stream) + process manager
- Advisory locks PostgreSQL no nível do lote
- Append transacional cross-stream se Emmett evoluir

O teste de concorrência no mesmo lote (acima) é o gate técnico: serialização por associação **deve** fazer a segunda `RecordDispensation` concorrente falhar/retry → reavaliar contra estado novo → emitir `LotInsufficientQuantity` se estoque insuficiente.

**Se passa**: Emmett vira peça oficial. ADR-001 transita para *Accepted* sem ressalvas.

**Se falha**: revisar — provavelmente substituindo Emmett por implementação in-house mais simples (event store próprio em Postgres + decide/evolve mantidos). ADR-001 vira *Superseded* por ADR-002.

## Premissas

Esta decisão assume:

- Event sourcing é o modelo certo para domínio regulado com chain of custody (alta confiança — chain of custody **é** event-sourced por natureza)
- Emmett é estável o suficiente para produção em domínio regulado (média confiança — spike gate testa isto)
- PostgreSQL event store do Emmett suporta volume de associação típico (alta confiança — ~1k eventos/dia/associação)
- TypeScript strict + Vitest oferecem ergonomia suficiente para domínio executável (alta confiança — validado em projetos prévios do autor)

Cf. [Premissas Regulatórias](/regulatory-assumptions/) para tracking sistemático de apostas.

## Referências

- [Emmett — event-driven-io/emmett](https://github.com/event-driven-io/emmett)
- [Emmett Getting Started — decide/evolve pattern](https://event-driven-io.github.io/emmett/getting-started.html)
- [Domain Kernel](/architecture/domain-kernel/) — implementação detalhada
- [AGENTS.md](https://github.com/seu-org/canna-oss/blob/main/AGENTS.md) — workflow operacional
