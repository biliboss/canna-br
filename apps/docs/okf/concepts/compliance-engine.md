---
type: concept
title: "Regras RDC 1.014 são executáveis no kernel"
description: "A compliance-engine do canna-br codifica as regras do sandbox RDC 1.014 como policies executáveis sobre o stream de eventos, não como prosa."
tags:
  - architecture
  - compliance
timestamp: "2026-06-17"
---

# Regras RDC 1.014 são executáveis no kernel

**Assertiva:** as regras regulatórias do sandbox RDC 1.014 são codificadas como
policies executáveis (guards, projeções) sobre o stream de eventos do
[domain-kernel](domain-kernel.md), tornando conformidade verificável em runtime — não
um PDF interpretado por humanos.

Isso fecha o argumento de confiança que justifica a [licença AGPL](oss-license.md):
quem audita o código audita a conformidade.

- Doc canônico: [compliance-engine.md](../../src/content/docs/architecture/compliance-engine.md)
- Volta ao [índice](../index.md).
</content>
