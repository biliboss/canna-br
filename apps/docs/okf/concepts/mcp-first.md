---
type: concept
title: "A superfície primária é MCP, não um admin web"
description: "O canna-br expõe capacidade via MCP Server + MCP Apps + Open WebUI sidecar; não há admin Next.js até pós-v1.0."
tags:
  - architecture
  - mcp
timestamp: "2026-06-17"
---

# A superfície primária é MCP, não um admin web

**Assertiva:** usuários e agentes operam o canna-br por uma superfície MCP-first
(MCP Server + MCP Apps embutidos + Open WebUI como sidecar), não por um painel
administrativo tradicional.

Cada tool MCP é um comando do [domain-kernel](domain-kernel.md); o resultado pode
renderizar como widget interativo inline. Isso mantém a regra de negócio no kernel e
a UI como camada fina.

- Doc canônico: [interfaces.md](../../src/content/docs/architecture/interfaces.md)
- Decisão: [ADR-002](../../src/content/docs/adr/0002-mcp-first-surface.md)
- Volta ao [índice](../index.md).
</content>
