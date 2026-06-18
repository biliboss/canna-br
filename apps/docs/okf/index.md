---
type: index
okf_version: "0.1"
title: "canna-br — OKF Knowledge Bundle"
description: "Bundle de conhecimento OKF-conformante do canna-br: grafo de conceitos com cross-links para os docs canônicos em apps/docs/src/content/docs/."
tags:
  - okf
  - canna-br
timestamp: "2026-06-17"
---

# canna-br — OKF Knowledge Bundle

Este é o índice OKF (Open Knowledge Format v0.1) do canna-br. Cada nó abaixo é uma
assertiva atômica legível por LLM, com `type` no frontmatter e cross-links Markdown
para o doc canônico correspondente. A prosa de produto vive em
`apps/docs/src/content/docs/` (collection Starlight roteada); este bundle é a
**camada de conhecimento aditiva** — estrutura > prosa solta.

## Por que um diretório dedicado `okf/`

O bundle vive em `apps/docs/okf/` (fora de `src/content/docs/`) porque: (1) um
`index.md` na raiz da collection colidiria com `index.mdx`; (2) tudo sob
`src/content/docs/` está sujeito ao `docsSchema` do Starlight; (3) o validador
(`scripts/validate-okf.sh`) lê frontmatter cru — um `default` Zod é invisível pra
ele, então o `type` precisa estar escrito de fato em cada `.md`, e aqui está.

## Grafo de Conceitos

### Arquitetura

- [domain-kernel](concepts/domain-kernel.md) — o domínio é event-sourced primeiro (Emmett); doc: [domain-kernel.md](../src/content/docs/architecture/domain-kernel.md).
- [mcp-first](concepts/mcp-first.md) — a superfície primária é MCP, não um admin web; doc: [interfaces.md](../src/content/docs/architecture/interfaces.md).
- [token-ledger](concepts/token-ledger.md) — contribuição é registrada num ledger event-sourced, sem especulação; doc: [token-ledger.md](../src/content/docs/architecture/token-ledger.md).
- [compliance-engine](concepts/compliance-engine.md) — regras RDC 1.014 são executáveis no kernel; doc: [compliance-engine.md](../src/content/docs/architecture/compliance-engine.md).

### Negócio

- [oss-license](concepts/oss-license.md) — AGPL-3.0 é decisão de confiança, não técnica; doc: [oss-model.md](../src/content/docs/business/oss-model.md).

## Arquivos reservados

- `index.md` (este arquivo) — raiz do bundle.
- [log.md](log.md) — histórico append-only de mudanças do bundle.
</content>
</invoke>
