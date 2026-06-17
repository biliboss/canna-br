---
type: glossary
title: Glossário de papéis e RBAC
description: Papéis do canna-br (DISPENSADOR, RESPONSAVEL_TECNICO, DIRETORIA, DPO, AUDITOR) e o que cada um pode executar, confirmado pelos allowedRoles das tools MCP.
tags: [rbac, roles, authz, glossary]
---

# Glossário de papéis e RBAC

RBAC é aplicado por `allowedRoles` em cada tool MCP. Esta tabela foi extraída diretamente dos arquivos em `apps/mcp/src/tools/*.ts`.

## Papéis

- **DISPENSADOR** — operador de balcão. **Único** papel que pode *solicitar* uma dispensação. Nunca aprova.
- **RESPONSAVEL_TECNICO (RT)** — responsável técnico farmacêutico. Aprova dispensações, registra membros, valida prescrições.
- **DIRETORIA** — diretoria da associação. Superpapel: aprova dispensações + todas as ações de RT + ações sensíveis (anonimização).
- **DPO** — Data Protection Officer (LGPD). Anonimização e revogação de consentimento.
- **AUDITOR** — somente leitura/auditoria. Sem escrita.

## Matriz capacidade × papel (allowedRoles reais)

| Tool MCP | DISPENSADOR | RT | DIRETORIA | DPO | AUDITOR |
|---|:---:|:---:|:---:|:---:|:---:|
| `request_record_dispensation` (solicitar) | ✅ | | | | |
| `approve_dispensation` (aprovar) | | ✅ | ✅ | | |
| `draft_dispensation` | ✅ | ✅ | | | |
| `register_member` | | ✅ | ✅ | | |
| `grant_consent` | | ✅ | ✅ | | |
| `revoke_consent` | | ✅ | ✅ | ✅ | |
| `validate_prescription` | | ✅ | ✅ | | |
| `suspend_member` | | ✅ | ✅ | | |
| `reinstate_member` | | ✅ | ✅ | | |
| `anonymize_member` | | | ✅ | ✅ | |
| `get_member_quota` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `find_member_by_cpf` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `get_members_by_status` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `generate_traceability_report` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `list_available_lots` | ✅ | ✅ | ✅ | ✅ | ✅ |

### Evidência (file:line dos `allowedRoles`)

- `request_record_dispensation` → `["DISPENSADOR"]` — `apps/mcp/src/tools/request-record-dispensation.ts:37`
- `approve_dispensation` → `["RESPONSAVEL_TECNICO", "DIRETORIA"]` — `apps/mcp/src/tools/approve-dispensation.ts:35`
- `draft_dispensation` → `["DISPENSADOR", "RESPONSAVEL_TECNICO"]` — `apps/mcp/src/tools/draft-dispensation.ts`
- `register_member` → `["RESPONSAVEL_TECNICO", "DIRETORIA"]` — `apps/mcp/src/tools/register-member.ts`
- `grant_consent` → `["RESPONSAVEL_TECNICO", "DIRETORIA"]` — `apps/mcp/src/tools/grant-consent.ts`
- `revoke_consent` → `["RESPONSAVEL_TECNICO", "DIRETORIA", "DPO"]` — `apps/mcp/src/tools/revoke-consent.ts`
- `validate_prescription` → `["RESPONSAVEL_TECNICO", "DIRETORIA"]` — `apps/mcp/src/tools/validate-prescription.ts`
- `suspend_member` → `["RESPONSAVEL_TECNICO", "DIRETORIA"]` — `apps/mcp/src/tools/suspend-member.ts`
- `reinstate_member` → `["RESPONSAVEL_TECNICO", "DIRETORIA"]` — `apps/mcp/src/tools/reinstate-member.ts`
- `anonymize_member` → `["DPO", "DIRETORIA"]` — `apps/mcp/src/tools/anonymize-member.ts`
- Leitura (`get_member_quota`, `find_member_by_cpf`, `get_members_by_status`, `generate_traceability_report`, `list_available_lots`) → os 5 papéis.

## Segregação além do RBAC

RBAC garante que o papel certo chama a tool; ele **não** garante segregação de função. A guarda de identidade (solicitante ≠ aprovador) é aplicada no domínio, não no RBAC — ver [RDC 1.014](rdc-1014-segregation.md). Por isso uma `DIRETORIA` que solicitou (via DISPENSADOR) ou um RT que é o próprio requester ainda recebe `APPROVAL_SEGREGATION_VIOLATION`.

## Conceitos relacionados

- [RDC 1.014 — Segregação de função](rdc-1014-segregation.md)
- [Ciclo de vida do associado](member-lifecycle.md)
- [Cota mensal](monthly-quota.md)
