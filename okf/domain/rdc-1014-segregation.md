---
type: rule
title: RDC 1.014 — Segregação de função na dispensação
description: A dispensação canábica exige dois atores distintos (solicitante ≠ aprovador) e a cota só é consumida no momento da aprovação.
tags: [rdc, dispensation, segregation, compliance]
---

# RDC 1.014 — Segregação de função

A dispensação é um fluxo de **duas etapas com atores distintos**. Quem **solicita** nunca pode ser quem **aprova**, mesmo que a mesma pessoa também possua papel de aprovador.

## A regra (confirmada no código)

1. **Etapa 1 — SOLICITAR.** Um `DISPENSADOR` chama `request_record_dispensation`. Isso registra um evento `DispensationRequested` **PENDENTE**. Nenhuma cota é consumida e nenhum estoque é deduzido nesta etapa.
   - `apps/mcp/src/tools/request-record-dispensation.ts:37` → `allowedRoles: ["DISPENSADOR"]`
   - `packages/domain/src/dispensation/decide.ts:238-281` (`decideRequest`) emite **apenas** `DispensationRequested` e não toca cota/estoque (comentário em `decide.ts:231-237`).

2. **Etapa 2 — APROVAR.** Um aprovador **distinto** (`RESPONSAVEL_TECNICO` ou `DIRETORIA`) chama `approve_dispensation`, passando **somente** o `dispensationId`. Os dados originais (membro/lote/quantidade/solicitante) são recuperados do evento `DispensationRequested` armazenado — o aprovador não pode adulterá-los.
   - `apps/mcp/src/tools/approve-dispensation.ts:35` → `allowedRoles: ["RESPONSAVEL_TECNICO", "DIRETORIA"]`
   - `apps/mcp/src/tools/approve-dispensation.ts:40-45`: o único input mutável é `dispensationId`.

3. **Guarda de segregação.** Na aprovação, o `requestedBy` original (do stream) é comparado com o `approvedBy`. Se forem a mesma identidade, o domínio retorna `APPROVAL_SEGREGATION_VIOLATION` — **mesmo que** essa pessoa tenha papel de aprovador.
   - `packages/domain/src/dispensation/decide.ts:292-318` (`decideApprove`) chama `decide()` com `dispensedBy = pending.requestedBy` e `approvedBy = cmd.approvedBy`.
   - `packages/domain/src/dispensation/decide.ts:45-51`: `if (cmd.approvedBy !== null && cmd.approvedBy === cmd.dispensedBy)` → `APPROVAL_SEGREGATION_VIOLATION`.
   - Guarda irmã: o dispensador também não pode ser o Responsável Técnico do estoque — `decide.ts:34-43` → `SEGREGATION_VIOLATION`.

4. **A cota só é consumida no APPROVE.** O caminho feliz só emite `DispensationRecorded` + `MemberQuotaConsumed` + `LotQuantityDeducted` (append atômico) dentro de `decide()`, alcançado apenas via `decideApprove`.
   - `packages/domain/src/dispensation/decide.ts:187-228` (os três eventos do caminho feliz).
   - `apps/mcp/src/tools/approve-dispensation.ts:16-18` (docstring: "quota consumed at this point, not before").

## Eventos de rejeição (audit, não erro)

Se a cota ou o estoque forem insuficientes **na aprovação**, o decider emite um evento de auditoria em vez de erro de domínio, e nada é efetivado:
- `QuotaExceededAttempt` — `decide.ts:151-167`
- `LotInsufficientQuantity` — `decide.ts:170-185`

A tool de aprovação detecta a ausência de `DispensationRecorded` e responde `status: "REJECTED"` (`approve-dispensation.ts:101-116`).

## Conceitos relacionados

- Fluxo de estados: [Ciclo de vida do associado](member-lifecycle.md)
- Como a cota é cravada e deduzida: [Cota mensal](monthly-quota.md)
- Quem pode solicitar/aprovar: [Glossário de papéis](roles-glossary.md)
