---
type: playbook
title: Ciclo de vida do associado
description: Estados e transições do membro (registro → consentimento → ativo → suspensão/anonimização) e qual tool MCP executa cada transição.
tags: [membership, lifecycle, lgpd, state-machine]
---

# Ciclo de vida do associado

A máquina de estados do membro é event-sourced. Os estados reais (`packages/domain/src/membership/state.ts:3-8`) são:

```
EMPTY → PENDING_CONSENT → ACTIVE → SUSPENDED → ACTIVE (reinstate)
                                  ↘ ANONYMIZED (terminal)
```

> ⚠️ **Nota de precisão (código vs spec):** não existe estado `CONSENT_REVOKED`. Revogar consentimento leva o membro para **`SUSPENDED`**, não para um estado próprio. Veja `evolve.ts:21-26` abaixo. `ANONYMIZED` é o estado terminal.

## Estados

| Estado | Significado | Pode dispensar? |
|---|---|---|
| `EMPTY` | Stream ainda não inicializado | Não |
| `PENDING_CONSENT` | Registrado, aguardando consentimento LGPD | Não |
| `ACTIVE` | Consentimento válido; pode receber prescrição e dispensação | Sim (se prescrição válida) |
| `SUSPENDED` | Suspenso (manual ou por revogação de consentimento) | Não |
| `ANONYMIZED` | Anonimizado (LGPD) — terminal | Não |

## Transições (comando → evento → estado), confirmadas no código

Fonte de transição: `packages/domain/src/membership/decide.ts` (guardas) + `packages/domain/src/membership/evolve.ts` (efeito no estado).

| De | Tool MCP | Comando | Evento | Para |
|---|---|---|---|---|
| `EMPTY` | `register_member` | `RegisterMember` | `MemberRegistered` | `PENDING_CONSENT` |
| `PENDING_CONSENT` | `grant_consent` | `GrantConsent` | `ConsentGranted` | `ACTIVE` |
| `ACTIVE` | `revoke_consent` | `RevokeConsent` | `ConsentRevoked` | `SUSPENDED` |
| `ACTIVE` | `validate_prescription` | `ValidatePrescription` | `PrescriptionValidated` (+`QuotaUpdated` se troca de prescrição) | `ACTIVE` (crava cota) |
| `ACTIVE` | `suspend_member` | `SuspendMember` | `MemberSuspended` | `SUSPENDED` |
| `SUSPENDED` | `reinstate_member` | `ReinstateMember` | `MemberReinstated` | `ACTIVE` |
| qualquer ≠`EMPTY`/`ANONYMIZED` | `anonymize_member` | `AnonymizeMember` | `MemberAnonymized` | `ANONYMIZED` |

### Evidência das guardas (decide.ts)

- `RegisterMember`: exige `status === "EMPTY"`, senão `MEMBER_ALREADY_REGISTERED` — `decide.ts:14-30`.
- `GrantConsent`: bloqueia `EMPTY` (`MEMBER_NOT_REGISTERED`) e `ANONYMIZED` (`MEMBER_ANONYMIZED`) — `decide.ts:32-59`. Efeito: `PENDING_CONSENT → ACTIVE` (`evolve.ts:15-20`).
- `RevokeConsent`: exige `status === "ACTIVE"` (`CONSENT_NOT_REVOCABLE`) — `decide.ts:61-83`. Efeito: `→ SUSPENDED` (`evolve.ts:21-26`).
- `ValidatePrescription`: exige `status === "ACTIVE"` (`MEMBER_NOT_ACTIVE`); valida janela `validFrom < validUntil` — `decide.ts:85-132`.
- `SuspendMember`: exige `ACTIVE` (`MEMBER_NOT_ACTIVE`) — `decide.ts:134-149`; efeito `→ SUSPENDED` (`evolve.ts:47-48`).
- `ReinstateMember`: exige `SUSPENDED` (`MEMBER_NOT_SUSPENDED`) — `decide.ts:151-165`; efeito `SUSPENDED → ACTIVE` (`evolve.ts:49-53`).
- `AnonymizeMember`: bloqueia `EMPTY` e `ANONYMIZED` — `decide.ts:167-187`; efeito `→ ANONYMIZED` resetando o estado (`evolve.ts:54-59`).

## Impacto na dispensação

`decideRequest`/`decide` rejeitam membro fora de `ACTIVE`: `MEMBER_NOT_ACTIVE` para `EMPTY`/`PENDING_CONSENT`, `MEMBER_SUSPENDED` para `SUSPENDED`, `MEMBER_ANONYMIZED` para `ANONYMIZED` — `packages/domain/src/dispensation/decide.ts:68-88, 265-269`.

## Conceitos relacionados

- Como `validate_prescription` crava a cota: [Cota mensal](monthly-quota.md)
- Fluxo de dispensação de duas etapas: [RDC 1.014 — Segregação de função](rdc-1014-segregation.md)
- Papéis que executam cada transição: [Glossário de papéis](roles-glossary.md)
