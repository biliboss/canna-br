# Roadmap

Roadmap canonical: [`apps/docs/src/content/docs/roadmap.md`](apps/docs/src/content/docs/roadmap.md) — servido em `http://localhost:4335/roadmap/`.

Este arquivo é apenas um resumo. Quando atualizar, edite o canonical primeiro.

## Resumo

| Fase | Janela | Foco |
|---|---|---|
| v0.1 — Domain Blueprint | DONE (2026-06-08) | Docs site + DDD + Event Storming + ADR-001 + Premissas Regulatórias |
| v0.2 — Domain Kernel + Compliance Spine | now → ago/2026 | `packages/domain` TS puro + Emmett spike + HTTP fino + relatório de rastreabilidade |
| v0.3 — Pilot Ready | set/2026 → dez/2026 | RBAC, TOTP, LGPD consent versionado, crypto-deletion, CSV import |
| v0.4 — Sandbox Dossier Ready | jan/2027 → mai/2027 | Dossier template, KPI dashboard, BSPO trimestral, RIPD |
| v0.5 — Regulatory Adapters | jun/2027 → dez/2027 | SNGPC adapter (mock → prod), SNCR adapter, schema versioning |
| v1.0 — Full Association ERP | 2028 | Cultivo, processing, lab, CPC 29, multi-tenant, managed hosting |
| v2.0 — Scale | 2029+ | LATAM, módulo clínico, B2G analytics |

Princípio: **spine-first**. Tronco = Member → Prescrição → Quota → Lote → Dispensação → Audit → Relatório. Cultivo, processing, lab, financeiro completo e managed hosting são galhos.

Capabilities que dependem de premissas *Especulativas* (cf. [Premissas Regulatórias](apps/docs/src/content/docs/regulatory-assumptions.md)) ficam em Ideas Park, não no roadmap.
