---
title: Changelog
---

# Changelog

## [Unreleased] — hardening rumo a v0.1 funcional

> A tag `v0.1.0` já existe; isto é endurecimento em curso, não um novo release. Ainda **não** declaramos "v0.1 funcional" — o loop de chat completo segue pendente (ver abaixo).

### Fixed
- **MCP `resources` capability** — servidor passa a anunciar `resources` + handlers ListResources/ReadResource servindo os 4 bundles de ui-apps (antes todo render de widget retornava 500).
- **Segregação de funções (RDC 1.014)** — dispensação rejeitada quando `approvedBy === dispensedBy` (`APPROVAL_SEGREGATION_VIOLATION`).
- **SNGPC retry** — fila BullMQ com 3 tentativas + backoff exponencial; falha transitória não manda mais submissão regulatória pro dead-letter.
- **`apps/agent` standalone** — fork vendorizado do dist do assistant-ui (Option B) + patch `packageExtensions` pro manifest faltante do `@event-driven-io/emmett-postgresql` (testes de event-store restaurados).
- **`get_member_quota`** — retorna `consumedG`/`remainingG` reais; `MemberQuotaCard` deixa de mostrar 0% fixo.
- **Flag de onboarding** — derivada de stats reais em vez de hardcoded `true`.

### Changed
- **`member-lifecycle-board` retido do registry por honestidade** — agregado cross-member sem read-model que o sustente; sentinela `primaryToolName: __unavailable__`. Será widget vivo quando existir `get_member_lifecycle` + read-model de enumeração (deferido para além do v0.1).

### QA
- **Render de widget keyless — PASS.** Smoke chrome-devtools sem chave: `member-quota-card`, `traceability-timeline`, `dispensation-form` renderizam ao vivo, zero erro de console; `member-quota-card` mostra 7g/30g reais. Harness: `apps/mcp/scripts/qa-render-harness.ts`.
- **Loop de chat completo — PARCIAL.** Ao vivo em chrome-devtools (apps/agent → apps/mcp HTTP, chave OpenRouter): mensagem → Claude chama `get_member_quota` → dado real Postgres (7g/23g) → **widget renderiza INLINE no chat**, zero erro de console. Destravou 3 bugs reais (transport stateless por-request, `_meta` slash-form, headers `x-canna-*`). **Resta:** card fica em "Loading" — handoff host→iframe do assistant-ui (instabilidade de args / `part.result`), em investigação.
- **Suíte: 216/216 verdes em 12 workspaces.**

## v0.1.0 — 2026-06-08

### Added
- Projeto scaffolded: Astro 5 + Starlight 0.37
- Domain model DDD completo: 8 bounded contexts, event storming, invariantes
- Research consolidado: marco legal BR, ANVISA sandbox, SNGPC, software landscape, modelos internacionais, mercado
- Arquitetura técnica: stack, chain of custody ULID, LGPD crypto, compliance engine
- Business model: OSS AGPL-3 + dual-license (CLA) + managed hosting, revenue model, GTM
