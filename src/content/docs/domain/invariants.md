---
title: Invariantes Críticos
description: Todos os invariantes de domínio do canna-oss — cross-context, por bounded context e camadas de enforcement
---

# Invariantes Críticos

Invariantes são regras de negócio que nunca podem ser violadas, independentemente do estado do sistema. No canna-oss, cada invariante é enforced em múltiplas camadas para garantia máxima.

---

## Cross-Context Invariants

Estes invariantes envolvem mais de um bounded context e são enforced na camada de aplicação via orquestração de use cases, não dentro de um único aggregate.

### 1. Quota Mensal (Membership × Dispensation)

```
Σ(dispensations_g this month for member M) + new_g ≤ M.quota_g_month
```

Verificado no use case `RecordDispensation` antes de criar o aggregate `Dispensation`. Falha gera `QuotaExceededAttempt` event sem criar dispensação.

### 2. Liberação de Lote Requer Aprovação de Lab (Processing × Inventory)

`InventoryLot` só transita de `QUARANTINE` para `AVAILABLE` após `LabSampleApproved` com `approver.role = RESPONSAVEL_TECNICO`. Verificado no event handler de `LabSampleApproved`.

### 3. Audit Log Imutável (todos os contextos)

PostgreSQL `RULE` bloqueia `UPDATE` e `DELETE` na tabela `event_log`. Nenhuma linha pode ser alterada após inserção — garantia no nível do banco de dados, independente da aplicação.

```sql
CREATE RULE no_update_event_log AS ON UPDATE TO event_log DO INSTEAD NOTHING;
CREATE RULE no_delete_event_log AS ON DELETE TO event_log DO INSTEAD NOTHING;
```

### 4. Segregação RBAC (Identity × Dispensation × Processing × Cultivation)

```
dispenser (DISPENSADOR) ≠ COA approver (RESPONSAVEL_TECNICO) ≠ cultivador (CULTIVADOR)
```

Exigência RDC 1.014. Verificado em middleware antes de cada use case. Um único usuário não pode acumular os três roles.

### 5. COA Hash Imutável Após Aprovação (Processing)

`LabSample.coa_file_hash` nunca pode ser alterado após `LabSampleApproved`. PostgreSQL constraint + guard no aggregate impedem qualquer modificação.

### 6. CPF Hash Único Por Tenant (Membership)

`CPFHash = SHA-256(cpf + site_salt)` é único dentro do tenant. `site_salt` é diferente por instância, garantindo que o mesmo CPF não possa ser correlacionado entre associações distintas. Unique constraint no banco.

### 7. Plant ULID Nunca Reutilizado (Cultivation)

ULID de planta é permanente e nunca reutilizado, mesmo após destruição. Constraint `UNIQUE` na tabela `plants` + guard no aggregate ao registrar nova planta.

---

## Invariantes por Bounded Context

### Membership

**INV-M1 — Consentimento Antes de Dispensação**
Membro em estado `PENDING_CONSENT` ou `SUSPENDED` não pode ter dispensações registradas. Guard no use case `RecordDispensation` verifica `member.status === 'ACTIVE'` e `member.consent_version === current_consent_version`.

**INV-M2 — Validade da Prescrição**
Prescrição médica expirada (`expired_at < now()`) transiciona automaticamente o membro para `SUSPENDED` via job agendado. Dispensação bloqueada enquanto em `SUSPENDED`.

**INV-M3 — Guard do Membro Anonimizado**
`ANONYMIZED` é estado terminal. Qualquer operação sobre membro anonimizado retorna erro de domínio `MemberAnonymizedError`. Guard no aggregate antes de qualquer método mutante.

**INV-M4 — Quota Enforced no Mês Corrente**
Quota é calculada com janela de calendário (`início do mês UTC → fim do mês UTC`). Sem carry-over entre meses.

---

### Cultivation

**INV-C1 — Progressão de Estágio Forward-Only**
A state machine de `Plant` só avança para frente: `GERMINATING → SEEDLING → VEGETATIVE → FLOWERING → HARVESTED`. Qualquer tentativa de regressão retorna `InvalidStageTransitionError`.

**INV-C2 — Destruição Requer Testemunha**
`PlantDestroyed` só é emitido se `witness_user_id` for fornecido e o usuário existir com role `CULTIVADOR` ou `RESPONSAVEL_TECNICO`. Sem testemunha = comando rejeitado.

**INV-C3 — Fair Value Obrigatório no Harvest**
`HarvestRecorded` é rejeitado se `fair_value_brl` não for fornecido ou for `≤ 0`. Compliance com CPC 29 — ativo biológico deve ser valorado a valor justo na colheita.

---

### Processing

**INV-P1 — Apenas RESPONSAVEL_TECNICO Aprova Lab**
Use case `ApproveLabSample` verifica `approver.role === 'RESPONSAVEL_TECNICO'` antes de qualquer operação. Role insuficiente retorna `InsufficientRoleError`.

**INV-P2 — COA Hash Imutável**
Após `LabSampleApproved`, o campo `coa_file_hash` é marcado como `immutable: true` no aggregate. Qualquer tentativa de atualização retorna `ImmutableFieldError`. PostgreSQL column-level trigger como segunda linha de defesa.

**INV-P3 — Lab Rejeitado Bloqueia Lote**
`LabSampleRejected` emite evento consumido por Inventory, que mantém o `InventoryLot` em `QUARANTINE`. Novo ciclo de amostragem deve ser iniciado explicitamente.

---

### Dispensation

**INV-D1 — Imutabilidade Após Criação**
`Dispensation` não possui métodos mutantes após `DispensationRecorded`. Sem cancel, sem update. Correções são feitas por nova dispensação compensatória com quantidade negativa (estorno), rastreada no audit log.

**INV-D2 — Consumo Atômico de Quota e Estoque**

`RecordDispensation` só é aceito se, no momento do `decide()`, o membro tem quota suficiente E o lote tem quantidade suficiente. O **mesmo append** no event store registra os três eventos:

- `DispensationRecorded`
- `MemberQuotaConsumed`
- `LotQuantityDeducted`

Read models de quota e estoque são projeções desses eventos. **Nenhum job assíncrono pode alterar estado regulatório crítico** — side effects externos (SNGPC XML, PDF, email) vão para BullMQ e sua falha não invalida a dispensação. Cf. [ADR-001](/adr/0001-domain-kernel-emmett/).

Concorrência entre dispensações no mesmo lote é protegida por **optimistic concurrency** no stream do lote: dois `RecordDispensation` paralelos no mesmo `inventory_lot_ref` não podem ambos passar — o segundo append falha por versão divergente e é re-validado contra o estado atualizado.

---

## Camadas de Enforcement

Cada invariante é verificado em múltiplas camadas independentes. Uma falha em qualquer camada impede a violação.

### Camada 1 — Domain Layer (TypeScript)

Invariantes verificados dentro dos métodos dos aggregates antes de emitir qualquer domain event.

```typescript
// Exemplo: guard de quota no aggregate Member
recordDispensation(quantityG: number): Result<void, QuotaExceededError> {
  const used = this.monthlyUsageG;
  if (used + quantityG > this.quotaGMonth) {
    return err(new QuotaExceededError({ used, requested: quantityG, quota: this.quotaGMonth }));
  }
  // ... prossegue
}
```

### Camada 2 — Application Layer (Use Cases)

Use cases verificam pré-condições cross-context antes de invocar aggregates. Inclui verificações de role, estado de entidades em outros contextos e regras de negócio que envolvem múltiplos aggregates.

```typescript
// Exemplo: use case RecordDispensation
async execute(cmd: RecordDispensationCommand): Promise<Result<void, DomainError>> {
  const member = await this.memberRepo.findById(cmd.memberRef);
  if (member.status !== 'ACTIVE') return err(new MemberNotActiveError());

  const lot = await this.lotRepo.findById(cmd.lotRef);
  if (lot.state !== 'AVAILABLE') return err(new LotNotAvailableError());

  // delega ao aggregate para verificação de quota
  return member.recordDispensation(cmd.quantityG);
}
```

### Camada 3 — Database Layer (PostgreSQL)

Constraints e RULE como última linha de defesa, independente da aplicação.

| Mecanismo | Invariante Protegido |
|---|---|
| `UNIQUE` constraint em `cpf_hash, tenant_id` | CPF único por tenant |
| `UNIQUE` constraint em `plant_id` | ULID de planta nunca reutilizado |
| `CHECK (quantity_g > 0)` em `dispensations` | Quantidade positiva |
| `CHECK (amount_brl ~ '^\d+\.\d{2}$')` | Formato Decimal(15,2) em Finance |
| `RULE no_update/no_delete` em `event_log` | Audit log imutável |
| Column-level trigger em `lab_samples.coa_file_hash` | COA hash imutável pós-aprovação |

### Camada 4 — RBAC Layer (Middleware)

Role verificado em middleware HTTP antes da execução de qualquer use case. Sem bypass possível via API direta.

```typescript
// Middleware de role enforcement
function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'InsufficientRole' });
    }
    next();
  };
}

// Rota protegida
router.post('/lab-samples/:id/approve',
  requireRole('RESPONSAVEL_TECNICO'),
  approveLabSampleController
);
```
