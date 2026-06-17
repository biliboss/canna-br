---
type: playbook
title: Cota mensal do associado
description: validate_prescription crava a cota mensal; a dispensação aprovada deduz consumed_g via projeção member_quota.
tags: [quota, prescription, dispensation, read-model]
---

# Cota mensal do associado

A cota mensal (em gramas) é **cravada pela prescrição** e **consumida pela dispensação aprovada**. O saldo restante é `monthlyQuotaG − consumedG` no mês corrente.

## 1. Cravar a cota — `validate_prescription`

`validate_prescription` (RT/DIRETORIA, exige membro `ACTIVE`) valida uma prescrição com `monthlyQuotaG`, `validFrom`, `validUntil` e `physicianCRM`.

- Tool: `apps/mcp/src/tools/validate-prescription.ts` → `allowedRoles: ["RESPONSAVEL_TECNICO", "DIRETORIA"]`.
- Comando `ValidatePrescription` emite `PrescriptionValidated` (`decide.ts:121-131`). A janela é validada: `validFrom < validUntil`, senão `PRESCRIPTION_INVALID_WINDOW` (`decide.ts:93-98`).
- Trocar de prescrição (id diferente) emite também `QuotaUpdated` antes de `PrescriptionValidated` (`decide.ts:99-120`).
- A cota fica gravada no estado do membro: `evolve.ts:27-46` grava `prescription.monthlyQuotaG`.

## 2. Consumir a cota — dispensação aprovada

A cota só é deduzida quando `approve_dispensation` efetiva a dispensação (ver [RDC 1.014](rdc-1014-segregation.md)). O decider:

- Calcula `quotaRemaining = monthlyQuotaG − quotaConsumedThisMonthG` (`decide.ts:143-149`).
- Se `quotaRemaining − quantityG < 0` → emite `QuotaExceededAttempt` (auditoria, **não** efetiva) — `decide.ts:151-167`.
- No caminho feliz emite `MemberQuotaConsumed` com `quotaBeforeG`/`quotaAfterG` — `decide.ts:209-217`.

## 3. Saldo consumido — projeção `member_quota`

`consumedG` é um acumulador por `(memberId, month)` que **soma cada `MemberQuotaConsumed`**:

- Projeção pura: `packages/read-models/src/projections/member-quota.ts:18-34` — `nextConsumed = previousConsumed + delta`, somente para eventos `MemberQuotaConsumed`.
- Leitura ao vivo: `get_member_quota` dobra o stream `MemberQuotaConsumed` da associação para o mês e retorna `consumedG` e `remainingG = max(0, monthlyQuotaG − consumedG)`.
  - `apps/mcp/src/tools/get-member-quota.ts:60-75`.
- O mês default é o mês UTC corrente (`YYYY-MM`) quando `month` é omitido — `get-member-quota.ts:51-53`; o decider exige que o mês da dispensação bata com a janela de cota carregada, senão `MONTH_MISMATCH` (`decide.ts:133-140`).

## Conceitos relacionados

- Pré-requisito: membro `ACTIVE` com prescrição válida — [Ciclo de vida do associado](member-lifecycle.md)
- A dedução só acontece na aprovação — [RDC 1.014 — Segregação de função](rdc-1014-segregation.md)
- Quem lê/crava cota — [Glossário de papéis](roles-glossary.md)
