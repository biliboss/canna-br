---
title: Bounded Contexts
description: 8 bounded contexts do domínio canna-br — agregados, entidades, value objects e invariantes
---

# Bounded Contexts

O domínio canna-br é organizado em 8 bounded contexts com fronteiras explícitas. Comunicação entre contextos ocorre exclusivamente por domain events e referências por ULID — nunca por FK direta entre contextos.

---

## 1. Membership

**Aggregate root:** `Member`

### Value Objects

| Value Object | Descrição |
|---|---|
| `CPFHash` | SHA-256 + site_salt (nunca CPF em claro) |
| `EncryptedPersonalData` | AES-256-GCM com member_key individual |
| `MonthlyQuotaGrams` | Quota mensal em gramas (imutável após definição médica) |
| `ConsentVersion` | Versão do termo LGPD + timestamp de aceite |

### Estados do Member

```
PENDING_CONSENT → ACTIVE → SUSPENDED → ANONYMIZED
```

Transição para `ANONYMIZED` aciona crypto-deletion: descarta `member_key`, substitui `EncryptedPersonalData` por tombstone. Irreversível.

### Invariantes

1. `CPFHash` único por tenant (site_salt diferente por instância)
2. Consentimento expresso (versão corrente) obrigatório antes de qualquer dispensação
3. Quota mensal enforced: `Σ(dispensações_g no mês) + nova_g ≤ quota_g_month`
4. Prescrição médica válida (não expirada) obrigatória para `ACTIVE`
5. `ANONYMIZED` bloqueia toda operação subsequente — guard no aggregate

---

## 2. Cultivation

**Aggregate root:** `CultivationBatch`

### Entidades

- `Plant` — identificada por ULID permanente (nunca reutilizado, mesmo após destruição)

### Value Objects

- `EncryptedGeolocation` — coordenadas cifradas (exigência RDC 1.013)
- `FairValueBRL` — valor justo CPC 29 calculado no harvest

### State Machine da Plant

```
GERMINATING → SEEDLING → VEGETATIVE → FLOWERING → HARVESTED
     ↓              ↓           ↓           ↓
  DESTROYED     DESTROYED   DESTROYED   DESTROYED
```

Qualquer estágio pode transitar para `DESTROYED`. Destruição exige registro de testemunha (`witness_user_id`).

### Invariantes

1. Progressão de estágio é forward-only (exceto `DESTROYED`)
2. Destruição requer `witness_user_id` com role `CULTIVADOR` ou `RESPONSAVEL_TECNICO`
3. `fair_value_brl` (CPC 29) obrigatório no evento `HarvestRecorded`
4. Geolocalização sempre cifrada em repouso
5. ULID da planta nunca reutilizado após destruição

---

## 3. Processing

**Aggregate root:** `HarvestBatch` (criado pelo evento `HarvestRecorded` vindo de Cultivation)

### Entidades

| Entidade | Campos-chave |
|---|---|
| `ProcessingRun` | `yield_pct` (GENERATED), `input_g`, `output_g` |
| `LabSample` | `coa_file_hash` (SHA-256), `thc_pct`, `cbd_pct`, `contaminants_pass` |

### Invariantes

1. Apenas usuário com role `RESPONSAVEL_TECNICO` pode aprovar `LabSample`
2. `coa_file_hash` imutável após `LabSampleApproved` — nenhum UPDATE permitido
3. `LabSampleRejected` bloqueia o `InventoryLot` upstream até nova amostra
4. `yield_pct` calculado automaticamente (`output_g / input_g`), não editável manualmente
5. Aprovação (aquisição ≠ aprovação ≠ dispensação — segregação RDC 1.014)

---

## 4. Inventory

**Aggregate root:** `InventoryLot`

### Estados do InventoryLot

```
QUARANTINE → AVAILABLE → EXHAUSTED
     ↓
  RECALLED
```

`RECALLED` é terminal — não pode ser revertido para `AVAILABLE`.

### Invariantes

1. Liberação (`QUARANTINE → AVAILABLE`) requer `LabSampleApproved` upstream
2. Aprovador do `LabSample` deve ter role `RESPONSAVEL_TECNICO`
3. `RECALLED` é irreversível — toda dispensação pendente do lote é bloqueada
4. Quantidade disponível nunca negativa (constraint + check no aggregate)

---

## 5. Dispensation

**Aggregate root:** `Dispensation` (imutável após criação)

### Referências Cross-Context

| Campo | Tipo | Origem |
|---|---|---|
| `member_ref` | ULID | Membership context |
| `inventory_lot_ref` | ULID | Inventory context |

Referências cross-context permanecem por ULID — sem FK direta. **Atomicidade vs consistência eventual** depende do tipo de fato:

- **Estado regulatório crítico (quota + estoque)** é atômico — emitido no mesmo append que `DispensationRecorded`. Optimistic concurrency garante consistência sem 2PC.
- **Integrações externas (SNGPC, PDF, email)** são eventualmente consistentes via BullMQ — falhas não invalidam a dispensação.
- **Read models cross-context** convergem a partir dos eventos — consistência eventual aceitável para queries de UI.

Cf. [ADR-001](/adr/0001-domain-kernel-emmett/) para o boundary sync vs async completo.

### Invariantes

1. `Dispensation` é imutável após criação — sem UPDATE, sem cancelamento por UI. Estorno é dispensação compensatória nova.
2. `decide()` rejeita comando se quota OU estoque insuficiente — emite `QuotaExceededAttempt` ou `LotInsufficientQuantity`, não `DispensationRecorded`.
3. `inventory_lot_ref` deve apontar para lote em estado `AVAILABLE` no momento do `decide()`.
4. `DispensationRecorded` + `MemberQuotaConsumed` + `LotQuantityDeducted` emitidos em **um único append** no event store.
5. XML SNGPC gerado **assincronamente** via BullMQ após `DispensationRecorded` — sua falha não invalida o fato regulatório.
6. Dispensador (`DISPENSADOR`) ≠ aprovador de COA (`RESPONSAVEL_TECNICO`) — segregação RDC 1.014.

---

## 6. Compliance

**Modelo:** Read model apenas (sem aggregate próprio)

Lê projeções de todos os outros contextos. Não emite commands — apenas gera relatórios.

### Relatórios Produzidos

| Relatório | Frequência | Formato |
|---|---|---|
| BSPO | Trimestral + anual | PDF + XML ANVISA |
| KPI Report | Sob demanda | 7 indicadores |
| DRE Mensal | Mensal | PDF |
| SNGPC Batch | Diário/semanal | XML batch ANVISA |
| Relatório Judicial | Sob demanda | PDF |

### Invariantes

1. Relatórios são value objects imutáveis após geração — nenhum UPDATE
2. BSPO assinado digitalmente pelo `RESPONSAVEL_TECNICO`
3. SNGPC batch enviado somente após confirmação de conectividade ANVISA

---

## 7. Finance

**Aggregate root:** `FinancialStatement`

### Entidades

| Entidade | Descrição |
|---|---|
| `DREMonth` | Demonstração de Resultado mensal |
| `BiologicalAssetValuation` | Valoração CPC 29 / IAS 41 por harvest |

### Invariantes

1. Todos os valores monetários como `Decimal(15,2)` — nunca `float`
2. `BiologicalAssetValuation` criado automaticamente por evento `HarvestRecorded`
3. DRE mensal consolidado no fechamento do mês (sem edição retroativa)
4. Mensalidades registradas por `MensalidadeRecorded` — rastreável por membro

---

## 9. StrainCatalog _(futuro / planejado)_

**Modelo:** Catálogo de referência — sem aggregate de escrita próprio no ledger.

Bounded context separado do ledger; expõe apenas leitura. Lido por [Chain of Custody](/architecture/chain-of-custody/) (campo `strain_id` em `cultivation_batch`), referenciado no SNGPC para nomenclatura canônica, e consumível pelo agente AI para recomendação baseada em canabinoides/terpenos. Nunca acoplado à contabilidade.

Gatilho de implementação: início do Chain of Custody OU primeira associação piloto cultivando variedade própria. Detalhes em [Strain Databases](/research/strain-databases/).

---

## 8. Identity & Access

**Aggregate root:** `User`

### RBAC — Roles Disponíveis

| Role | Permissões principais |
|---|---|
| `ADMIN` | Gestão de usuários, configuração do tenant |
| `RESPONSAVEL_TECNICO` | Aprovação de COA, assinatura BSPO |
| `DISPENSADOR` | Registrar dispensações |
| `CULTIVADOR` | Registrar plantas, avançar estágios |
| `FINANCEIRO` | Visualizar/gerar DRE e financeiro |
| `AUDITOR` | Leitura completa, sem escrita |
| `MEMBRO` | Acesso ao próprio prontuário |

### Invariantes

1. TOTP obrigatório para roles `ADMIN`, `RESPONSAVEL_TECNICO`, `DISPENSADOR`
2. Segregação RDC 1.014: aquisição ≠ aprovação ≠ dispensação (roles distintos)
3. `AUDITOR` tem acesso read-only — nenhum command permitido
4. Senha nunca armazenada em claro — bcrypt + pepper
5. Sessão invalidada imediatamente após `UserRoleChanged`
