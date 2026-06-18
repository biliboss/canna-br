---
type: concept
title: "Domain Kernel é event-sourced primeiro"
description: "O domínio do canna-br é modelado como event-sourcing (Emmett) antes de qualquer UI ou persistência — decide/evolve puros, o resto é raw."
tags:
  - architecture
  - event-sourcing
timestamp: "2026-06-17"
---

# Domain Kernel é event-sourced primeiro

**Assertiva:** o comportamento de negócio do canna-br vive num kernel event-sourced
(funções puras `decide`/`evolve` sobre Emmett), e tudo o mais — HTTP, MCP,
persistência — é periferia substituível.

Isso torna as regras testáveis por cenário (given-events → when-command →
then-events) sem subir infra, e habilita o [token-ledger](token-ledger.md) e a
[compliance-engine](compliance-engine.md), que são projeções/policies sobre o mesmo
stream de eventos.

- Doc canônico: [domain-kernel.md](../../src/content/docs/architecture/domain-kernel.md)
- Decisão: [ADR-001](../../src/content/docs/adr/0001-domain-kernel-emmett.md)
- Volta ao [índice](../index.md).
</content>
