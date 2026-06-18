---
type: log
title: "OKF Bundle — Log"
description: "Histórico append-only de mudanças do bundle OKF do canna-br."
timestamp: "2026-06-17"
---

# OKF Bundle — Log

Append-only. Cada entrada = uma mudança no bundle.

## 2026-06-17 — Bundle inicial (cb-w12 Camada OKF)

- Bundle OKF v0.1 criado em `apps/docs/okf/`.
- `index.md` com grafo de 5 conceitos (domain-kernel, mcp-first, token-ledger, compliance-engine, oss-license) cross-linkando os docs canônicos.
- Campo `type` adicionado ao schema Zod da collection `docs` (default `"doc"`, aditivo).
- Gate `scripts/validate-okf.sh` (E1/E2/E3 + warnings de title/description/órfão) plugado no lefthook pre-push.
</content>
