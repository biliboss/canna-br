---
title: Catálogo de Domain Events
description: Todos os domain events do canna-oss organizados por bounded context — payload e políticas disparadas
---

# Catálogo de Domain Events

Todos os eventos são imutáveis após emissão. Armazenados no `event_log` (append-only, sem UPDATE/DELETE via PostgreSQL RULE). Identificados por ULID.

## Base Interface

```typescript
interface DomainEvent {
  id: string;          // ULID
  type: string;        // event name
  aggregateId: string; // ULID of the aggregate
  occurredAt: Date;    // UTC
  version: number;     // aggregate version
  payload: Record<string, unknown>;
}
```

---

## Membership

### `MemberRegistered`

| Campo | Tipo | Descrição |
|---|---|---|
| `member_id` | ULID | Identificador do membro |
| `cpf_hash` | string | SHA-256 + site_salt |
| `consent_version` | string | Versão do termo LGPD aceito |
| `quota_g_month` | number | Quota mensal inicial em gramas |

**Dispara:** criação do prontuário criptografado; notificação ao `RESPONSAVEL_TECNICO`.

---

### `ConsentRevoked`

| Campo | Tipo | Descrição |
|---|---|---|
| `member_id` | ULID | |
| `revoked_at` | Date | UTC |
| `reason` | string | `MEMBER_REQUEST` \| `MEDICAL_REVOCATION` |

**Dispara:** suspensão imediata de dispensações pendentes; início do processo de crypto-deletion.

---

### `MedicalRecordExpired`

| Campo | Tipo | Descrição |
|---|---|---|
| `member_id` | ULID | |
| `expired_at` | Date | Data de expiração da prescrição |

**Dispara:** transição do membro para `SUSPENDED`; notificação ao responsável técnico.

---

### `QuotaUpdated`

| Campo | Tipo | Descrição |
|---|---|---|
| `member_id` | ULID | |
| `old_quota_g` | number | Quota anterior |
| `new_quota_g` | number | Nova quota |
| `updated_by` | ULID | user_id do `RESPONSAVEL_TECNICO` |

**Dispara:** recalculo de saldo disponível no mês corrente.

---

### `MemberSuspended`

| Campo | Tipo | Descrição |
|---|---|---|
| `member_id` | ULID | |
| `reason` | string | `MEDICAL_RECORD_EXPIRED` \| `COMPLIANCE_FLAG` \| `ADMIN_ACTION` |
| `suspended_by` | ULID | user_id |

**Dispara:** bloqueio de novas dispensações; registro no audit log.

---

### `MemberAnonymized`

| Campo | Tipo | Descrição |
|---|---|---|
| `member_id` | ULID | |
| `anonymized_at` | Date | UTC |

**Dispara:** crypto-deletion da `member_key`; substituição de `EncryptedPersonalData` por tombstone. Irreversível.

---

### `QuotaExceededAttempt`

| Campo | Tipo | Descrição |
|---|---|---|
| `member_id` | ULID | |
| `attempted_g` | number | Gramas tentadas |
| `available_g` | number | Gramas disponíveis no mês |
| `attempted_by` | ULID | user_id do dispensador |

**Dispara:** bloqueio da dispensação; alerta ao `ADMIN` e `RESPONSAVEL_TECNICO`.

---

## Cultivation

### `CultivationBatchStarted`

| Campo | Tipo | Descrição |
|---|---|---|
| `batch_id` | ULID | |
| `strain` | string | Cultivar/strain |
| `started_by` | ULID | user_id do `CULTIVADOR` |
| `location_encrypted` | string | Geolocalização cifrada AES-256-GCM |

**Dispara:** criação do registro de lote no sistema; notificação ao `RESPONSAVEL_TECNICO`.

---

### `PlantRegistered`

| Campo | Tipo | Descrição |
|---|---|---|
| `plant_id` | ULID | Permanente — nunca reutilizado |
| `batch_id` | ULID | |
| `stage` | string | `GERMINATING` (inicial) |

**Dispara:** registro no inventário de plantas vivas.

---

### `PlantStageAdvanced`

| Campo | Tipo | Descrição |
|---|---|---|
| `plant_id` | ULID | |
| `from_stage` | string | Estágio anterior |
| `to_stage` | string | Novo estágio |
| `advanced_by` | ULID | user_id |

**Dispara:** atualização do estado da planta; log de progressão.

---

### `PlantDestroyed`

| Campo | Tipo | Descrição |
|---|---|---|
| `plant_id` | ULID | |
| `reason` | string | Motivo da destruição |
| `witness_user_id` | ULID | Testemunha obrigatória |
| `destroyed_at` | Date | UTC |

**Dispara:** remoção do inventário ativo; registro permanente no audit log.

---

### `HarvestRecorded`

| Campo | Tipo | Descrição |
|---|---|---|
| `batch_id` | ULID | |
| `harvest_g` | number | Massa colhida em gramas |
| `fair_value_brl` | string | Decimal(15,2) — CPC 29 |
| `harvested_by` | ULID | user_id |

**Dispara:** criação de `HarvestBatch` em Processing; criação de `BiologicalAssetValuation` em Finance.

---

### `BatchClosed`

| Campo | Tipo | Descrição |
|---|---|---|
| `batch_id` | ULID | |
| `total_plants` | number | |
| `total_harvest_g` | number | |
| `closed_by` | ULID | user_id |

**Dispara:** encerramento do ciclo de cultivo; dados disponíveis para BSPO.

---

## Processing

### `ProcessingRunCompleted`

| Campo | Tipo | Descrição |
|---|---|---|
| `run_id` | ULID | |
| `harvest_batch_id` | ULID | |
| `input_g` | number | |
| `output_g` | number | |
| `yield_pct` | number | Calculado: `output_g / input_g` |

**Dispara:** criação de `LabSample` para análise; notificação ao `RESPONSAVEL_TECNICO`.

---

### `LabSampleSubmitted`

| Campo | Tipo | Descrição |
|---|---|---|
| `sample_id` | ULID | |
| `run_id` | ULID | |
| `coa_file_hash` | string | SHA-256 do arquivo COA |
| `lab_name` | string | Laboratório acreditado |

**Dispara:** aguarda aprovação/rejeição pelo `RESPONSAVEL_TECNICO`.

---

### `LabSampleApproved`

| Campo | Tipo | Descrição |
|---|---|---|
| `sample_id` | ULID | |
| `thc_pct` | number | |
| `cbd_pct` | number | |
| `contaminants_pass` | boolean | |
| `approved_by` | ULID | Deve ter role `RESPONSAVEL_TECNICO` |

**Dispara:** transição do `InventoryLot` de `QUARANTINE` para `AVAILABLE`.

---

### `LabSampleRejected`

| Campo | Tipo | Descrição |
|---|---|---|
| `sample_id` | ULID | |
| `reason` | string | Motivo da rejeição |
| `rejected_by` | ULID | user_id `RESPONSAVEL_TECNICO` |

**Dispara:** bloqueio do `InventoryLot` até nova amostra; notificação ao `CULTIVADOR`.

---

## Inventory

### `LotQuarantined`

| Campo | Tipo | Descrição |
|---|---|---|
| `lot_id` | ULID | |
| `harvest_batch_id` | ULID | |
| `quantity_g` | number | |

**Dispara:** criação do lote em estado `QUARANTINE`; aguarda `LabSampleApproved`.

---

### `LotReleased`

| Campo | Tipo | Descrição |
|---|---|---|
| `lot_id` | ULID | |
| `released_by` | ULID | user_id `RESPONSAVEL_TECNICO` |
| `released_at` | Date | UTC |

**Dispara:** lote disponível para dispensação; atualização do estoque disponível.

---

### `LotExhausted`

| Campo | Tipo | Descrição |
|---|---|---|
| `lot_id` | ULID | |
| `exhausted_at` | Date | UTC |

**Dispara:** remoção do lote do estoque ativo; registro para BSPO.

---

### `LotRecalled`

| Campo | Tipo | Descrição |
|---|---|---|
| `lot_id` | ULID | |
| `reason` | string | Motivo do recall |
| `recalled_by` | ULID | user_id |

**Dispara:** bloqueio imediato de dispensações; notificação de urgência ao `RESPONSAVEL_TECNICO` e `ADMIN`. Estado terminal — irreversível.

---

## Dispensation

### `DispensationRecorded`

Fato da entrega — emitido no **mesmo append** de `MemberQuotaConsumed` + `LotQuantityDeducted`. Cf. [ADR-001](/adr/0001-domain-kernel-emmett/).

| Campo | Tipo | Descrição |
|---|---|---|
| `dispensation_id` | ULID | |
| `member_ref` | ULID | Cross-context ref para Membership |
| `inventory_lot_ref` | ULID | Cross-context ref para Inventory |
| `quantity_g` | number | |
| `dispensed_by` | ULID | user_id `DISPENSADOR` |
| `dispensed_at` | Date | UTC |
| `prescription_ref` | ULID | Prescrição vigente no momento da dispensação |
| `approved_by` | ULID \| null | Approver (preenchido se via MCP two-step approval) |

**Dispara (síncrono, mesmo append):** `MemberQuotaConsumed` + `LotQuantityDeducted`.
**Dispara (BullMQ async):** geração de XML SNGPC, PDF recibo, email notificação.

---

### `MemberQuotaConsumed`

Fato da quota — projetado pelo read model `member_quota`. Emitido **junto** com `DispensationRecorded` em um único append.

| Campo | Tipo | Descrição |
|---|---|---|
| `member_id` | ULID | |
| `dispensation_id` | ULID | Evento que originou o consumo |
| `month` | string | `YYYY-MM` — janela de quota |
| `quantity_g` | number | Quantidade consumida |
| `quota_before_g` | number | Saldo antes da consumação |
| `quota_after_g` | number | Saldo após — invariante: ≥ 0 |
| `consumed_by` | ULID | user_id `DISPENSADOR` |
| `occurred_at` | Date | UTC |

**Invariante:** `quota_after_g === quota_before_g - quantity_g` e `quota_after_g ≥ 0`. Violado → `decide()` rejeita com `QuotaExceededAttempt`.

---

### `LotQuantityDeducted`

Fato do estoque — projetado pelo read model `inventory_lot`. Emitido **junto** com `DispensationRecorded`.

| Campo | Tipo | Descrição |
|---|---|---|
| `lot_id` | ULID | |
| `dispensation_id` | ULID | Evento que originou a dedução |
| `quantity_g` | number | Quantidade deduzida |
| `quantity_before_g` | number | Saldo antes |
| `quantity_after_g` | number | Saldo após — invariante: ≥ 0 |
| `deducted_by` | ULID | user_id `DISPENSADOR` |
| `occurred_at` | Date | UTC |

**Invariante:** `quantity_after_g === quantity_before_g - quantity_g` e `quantity_after_g ≥ 0`. Violado → `decide()` rejeita com `LotInsufficientQuantity`. Concorrência protegida por optimistic concurrency no stream do lote (ver ADR-001 spike gate).

---

### `QuotaExceededAttempt`

Tentativa registrada de dispensar acima da quota. **Não** altera estado — serve como evidência de bloqueio para auditoria + alerta DPO/RT.

| Campo | Tipo | Descrição |
|---|---|---|
| `member_id` | ULID | |
| `attempted_quantity_g` | number | |
| `quota_remaining_g` | number | |
| `attempted_by` | ULID | user_id `DISPENSADOR` |
| `attempted_at` | Date | UTC |

---

### `LotInsufficientQuantity`

Tentativa registrada de dispensar acima do estoque disponível do lote.

| Campo | Tipo | Descrição |
|---|---|---|
| `lot_id` | ULID | |
| `attempted_quantity_g` | number | |
| `lot_remaining_g` | number | |
| `attempted_by` | ULID | user_id `DISPENSADOR` |
| `attempted_at` | Date | UTC |

---

### `SngpcXmlGenerated`

| Campo | Tipo | Descrição |
|---|---|---|
| `dispensation_id` | ULID | |
| `xml_hash` | string | SHA-256 do XML gerado |
| `generated_at` | Date | UTC |

**Dispara:** envio ao servidor SNGPC ANVISA.

---

### `SngpcXmlSent`

| Campo | Tipo | Descrição |
|---|---|---|
| `dispensation_id` | ULID | |
| `anvisa_protocol` | string | Protocolo de confirmação ANVISA |
| `sent_at` | Date | UTC |

**Dispara:** marcação como transmitido; registro no Compliance.

---

### `SngpcXmlFailed`

| Campo | Tipo | Descrição |
|---|---|---|
| `dispensation_id` | ULID | |
| `error_code` | string | Código de erro ANVISA |
| `attempt` | number | Número da tentativa (max 3) |

**Dispara:** requeue com backoff exponencial (BullMQ); alerta ao `RESPONSAVEL_TECNICO` após 3 falhas.

---

## Compliance

### `BspoGenerated`

| Campo | Tipo | Descrição |
|---|---|---|
| `report_id` | ULID | |
| `period` | string | `Q1/2026`, `ANUAL/2026` etc. |
| `file_hash` | string | SHA-256 do PDF/XML gerado |
| `signed_by` | ULID | user_id `RESPONSAVEL_TECNICO` |

**Dispara:** disponibilização para envio ANVISA; registro de auditoria.

---

### `KpiReportGenerated`

| Campo | Tipo | Descrição |
|---|---|---|
| `report_id` | ULID | |
| `period_start` | Date | |
| `period_end` | Date | |
| `kpi_count` | number | 7 indicadores |

**Dispara:** disponibilização no dashboard de Compliance.

---

### `SngpcBatchSent`

| Campo | Tipo | Descrição |
|---|---|---|
| `batch_id` | ULID | |
| `dispensation_count` | number | |
| `anvisa_protocol` | string | |

**Dispara:** marcação em massa de dispensações como transmitidas.

---

### `DreGenerated` *(Compliance)*

| Campo | Tipo | Descrição |
|---|---|---|
| `report_id` | ULID | |
| `month` | string | `YYYY-MM` |
| `file_hash` | string | SHA-256 |

**Dispara:** disponibilização para o contexto Finance.

---

### `JudicialReportGenerated`

| Campo | Tipo | Descrição |
|---|---|---|
| `report_id` | ULID | |
| `member_ref` | ULID | Membro solicitante (se aplicável) |
| `generated_by` | ULID | user_id `RESPONSAVEL_TECNICO` |

**Dispara:** disponibilização para download seguro; log de auditoria.

---

## Finance

### `BiologicalAssetValued`

| Campo | Tipo | Descrição |
|---|---|---|
| `valuation_id` | ULID | |
| `harvest_batch_id` | ULID | |
| `fair_value_brl` | string | Decimal(15,2) — CPC 29 / IAS 41 |
| `valued_at` | Date | UTC |

**Dispara:** atualização do balanço patrimonial; input para DRE do mês.

---

### `DreGenerated` *(Finance)*

| Campo | Tipo | Descrição |
|---|---|---|
| `statement_id` | ULID | |
| `month` | string | `YYYY-MM` |
| `revenue_brl` | string | Decimal(15,2) |
| `expenses_brl` | string | Decimal(15,2) |
| `result_brl` | string | Decimal(15,2) |

**Dispara:** publicação no dashboard Finance; input para BSPO anual.

---

### `MensalidadeRecorded`

| Campo | Tipo | Descrição |
|---|---|---|
| `record_id` | ULID | |
| `member_ref` | ULID | |
| `amount_brl` | string | Decimal(15,2) |
| `reference_month` | string | `YYYY-MM` |

**Dispara:** atualização do DRE do mês; rastreabilidade por membro.

---

## Identity & Access

### `UserCreated`

| Campo | Tipo | Descrição |
|---|---|---|
| `user_id` | ULID | |
| `role` | string | Role inicial |
| `created_by` | ULID | user_id `ADMIN` |

**Dispara:** envio de convite por e-mail; obrigação de configurar TOTP (roles críticos).

---

### `UserRoleChanged`

| Campo | Tipo | Descrição |
|---|---|---|
| `user_id` | ULID | |
| `old_role` | string | |
| `new_role` | string | |
| `changed_by` | ULID | user_id `ADMIN` |

**Dispara:** invalidação imediata de todas as sessões ativas do usuário.

---

### `LoginSucceeded`

| Campo | Tipo | Descrição |
|---|---|---|
| `user_id` | ULID | |
| `ip` | string | IP de origem (anonimizado) |
| `totp_used` | boolean | |

**Dispara:** registro no audit log; atualização de `last_login_at`.

---

### `LoginFailed`

| Campo | Tipo | Descrição |
|---|---|---|
| `user_id` | ULID \| null | null se usuário não encontrado |
| `ip` | string | |
| `attempt` | number | Contador de falhas consecutivas |

**Dispara:** bloqueio temporário após 5 tentativas; alerta ao `ADMIN` após 10.

---

### `TOTPEnabled`

| Campo | Tipo | Descrição |
|---|---|---|
| `user_id` | ULID | |
| `enabled_at` | Date | UTC |

**Dispara:** liberação de acesso completo para roles críticos (`RESPONSAVEL_TECNICO`, `DISPENSADOR`).
