---
title: "Compliance Engine"
description: "SNGPC XML nativo, BSPO auto-gerado, KPI dashboard, DRE + CPC 29 — relatórios ANVISA sem intervenção manual."
---

## Relatórios Gerados

| Relatório | Periodicidade | Prazo | Destinatário |
|---|---|---|---|
| SNGPC XML | Por dispensação + batch diário | Até 24h após dispensação | ANVISA (RNDS) |
| BSPO Trimestral | Trimestral | 15 jan / 15 abr / 15 jul / 15 out | ANVISA |
| BSPO Anual | Anual | 31 janeiro | ANVISA |
| KPI Dashboard | Mensal | Último dia do mês | Diretoria |
| DRE + Balanço (CPC 29) | Mensal | Até dia 10 do mês seguinte | Tesouraria / Contador |
| Relatório Judicial | Semestral | jun + dez | Arquivo associação |
| Rastreabilidade Full | Sob demanda | Imediato (geração síncrona) | Auditoria / Fiscalização |

---

## SNGPC XML

Cada dispensação gera automaticamente um registro SNGPC. O batch diário consolida todas as dispensações do dia em um único XML para envio à RNDS:

```typescript
// Schema do XML SNGPC por dispensação
interface SNGPCDispensacao {
  cnes: string;                    // CNES da associação (requer habilitação)
  cnpj: string;                    // CNPJ da associação
  dataDispensacao: string;         // YYYY-MM-DD
  horaDispensacao: string;         // HH:MM:SS
  cpfPaciente: string;             // CPF decriptografado apenas neste momento
  nomePaciente: string;            // Nome decriptografado apenas neste momento
  produto: {
    descricao: string;             // Ex: "Óleo de Cannabis 10mg/mL CBD"
    concentracao: string;
    formaFarmaceutica: string;
    quantidadeDispensada: number;  // Em gramas
    unidadeMedida: "g" | "mL" | "unidade";
    lote: string;                  // ULID do inventory_lot
    validade: string;              // YYYY-MM-DD
  };
  prescricao: {
    numeroPrescricao: string;
    dataEmissao: string;
    crmMedico: string;
    ufCRM: string;
  };
}
```

**Fluxo de geração:**
1. Dispensação registrada → evento `DispensationRecorded` appendado no event store (junto com `MemberQuotaConsumed` + `LotQuantityDeducted`, cf. [ADR-001](/adr/0001-domain-kernel-emmett/))
2. Worker SNGPC (BullMQ) consome `DispensationRecorded` → gera XML individual
3. Batch diário às 23:45h consolida XMLs do dia → envia para RNDS
4. Resposta da RNDS armazenada no `sngpc_submissions` com status e número de protocolo

Falha na geração/envio do XML **não invalida** a dispensação registrada — fluxo assíncrono separado do estado regulatório crítico.

---

## BSPO — Balanço de Substâncias Psicoativas e Outras

### Fórmula de Saldo

```
Saldo Final = Saldo Inicial + Entradas − Saídas − Perdas Documentadas
```

O saldo deve bater com `SUM(inventory_lots.quantity_g)` para cada produto ativo:

```sql
-- Verificação de consistência BSPO
WITH bspo_calc AS (
  SELECT
    product_type,
    SUM(CASE WHEN type = 'entrada' THEN quantity_g ELSE 0 END) AS total_entradas,
    SUM(CASE WHEN type = 'saida' THEN quantity_g ELSE 0 END) AS total_saidas,
    SUM(CASE WHEN type = 'perda' THEN quantity_g ELSE 0 END) AS total_perdas,
    first_value(saldo_g) OVER (ORDER BY period_start) AS saldo_inicial
  FROM bspo_movements
  WHERE period_start >= $1 AND period_end <= $2
  GROUP BY product_type
),
inventory_actual AS (
  SELECT product_type, SUM(quantity_g) AS saldo_atual
  FROM inventory_lots
  WHERE status = 'active'
  GROUP BY product_type
)
SELECT
  b.product_type,
  b.saldo_inicial + b.total_entradas - b.total_saidas - b.total_perdas AS saldo_calculado,
  i.saldo_atual AS saldo_fisico,
  ABS((b.saldo_inicial + b.total_entradas - b.total_saidas - b.total_perdas) - i.saldo_atual) AS divergencia_g
FROM bspo_calc b
JOIN inventory_actual i USING (product_type);
```

Divergência > 0 gera alerta automático para o DPO e responsável técnico.

---

## 7 KPIs do Dashboard

### KPI 1 — Membros Ativos

```sql
SELECT COUNT(*) AS membros_ativos
FROM members
WHERE status = 'active'
  AND association_id = $tenant_id;
```

### KPI 2 — Dispensações no Mês

```sql
SELECT COUNT(*) AS dispensacoes_mes,
       SUM(quantity_g) AS total_dispensado_g
FROM dispensations
WHERE dispensed_at >= date_trunc('month', now())
  AND dispensed_at < date_trunc('month', now()) + INTERVAL '1 month'
  AND association_id = $tenant_id;
```

### KPI 3 — Estoque Disponível (por tipo de produto)

```sql
SELECT product_type,
       SUM(quantity_g) AS estoque_total_g,
       MIN(expires_at) AS proxima_validade
FROM inventory_lots
WHERE status = 'active'
  AND expires_at > now()
  AND association_id = $tenant_id
GROUP BY product_type;
```

### KPI 4 — Taxa de Ocupação Cultivo

```sql
-- Plantas ativas / capacidade total declarada da área de cultivo
SELECT
  l.name AS area,
  COUNT(p.id) AS plantas_ativas,
  l.max_capacity AS capacidade,
  ROUND(COUNT(p.id)::numeric / l.max_capacity * 100, 1) AS ocupacao_pct
FROM grow_locations l
LEFT JOIN cultivation_batches cb ON cb.location_id = l.id
LEFT JOIN plants p ON p.batch_id = cb.id AND p.destroyed_at IS NULL
WHERE l.association_id = $tenant_id
GROUP BY l.id, l.name, l.max_capacity;
```

### KPI 5 — Colheitas no Trimestre (peso seco total)

```sql
SELECT
  date_trunc('quarter', harvest_date) AS trimestre,
  COUNT(*) AS colheitas,
  SUM(dry_weight_g) AS peso_seco_total_g,
  ROUND(AVG(dry_weight_g), 2) AS media_por_colheita_g
FROM harvest_batches
WHERE association_id = $tenant_id
  AND harvest_date >= date_trunc('quarter', now()) - INTERVAL '1 quarter'
GROUP BY trimestre
ORDER BY trimestre DESC;
```

### KPI 6 — Laudos Pendentes

```sql
SELECT COUNT(*) AS laudos_pendentes
FROM lab_samples
WHERE result_received_at IS NULL
  AND collected_at < now() - INTERVAL '14 days'  -- prazo esperado
  AND association_id = $tenant_id;
```

### KPI 7 — Receita Operacional (mensalidades + taxas)

```sql
SELECT
  date_trunc('month', paid_at) AS mes,
  SUM(amount) AS receita_total,
  COUNT(*) AS pagamentos,
  COUNT(DISTINCT member_id) AS membros_pagantes
FROM financial_transactions
WHERE type IN ('membership_fee', 'dispensation_fee')
  AND status = 'confirmed'
  AND association_id = $tenant_id
  AND paid_at >= date_trunc('month', now()) - INTERVAL '3 months'
GROUP BY mes
ORDER BY mes DESC;
```

---

## CPC 29 / IAS 41 — Ativos Biológicos

Plantas vivas em cultivo são classificadas como **ativo biológico** conforme CPC 29 (equivalente ao IAS 41 internacional). Isso impacta o balanço patrimonial da associação:

### Reconhecimento no Balanço

```
Ativo Circulante
  └── Ativos Biológicos (CPC 29)
        └── Plantas em Cultivo
              Mensuração: Valor Justo − Custos de Venda
              Base: estimativa de produção × preço médio de mercado CBD/THC
```

### Cálculo de Fair Value por Colheita Estimada

```sql
-- Estimativa de fair value das plantas ativas
SELECT
  cb.strain_id,
  s.name AS cepa,
  COUNT(p.id) AS plantas_ativas,
  s.avg_yield_g AS rendimento_medio_g_por_planta,
  COUNT(p.id) * s.avg_yield_g AS producao_estimada_g,
  -- preço de mercado referência (definido pelo DRE anualmente)
  mp.price_per_g_brl AS preco_referencia,
  COUNT(p.id) * s.avg_yield_g * mp.price_per_g_brl AS fair_value_brl
FROM cultivation_batches cb
JOIN strains s ON s.id = cb.strain_id
JOIN plants p ON p.batch_id = cb.id AND p.destroyed_at IS NULL
JOIN market_prices mp ON mp.product_type = 'flower' AND mp.valid_at <= now()
WHERE cb.association_id = $tenant_id
GROUP BY cb.strain_id, s.name, s.avg_yield_g, mp.price_per_g_brl;
```

O relatório DRE + Balanço exporta esses valores em formato compatível com sistemas contábeis (CSV + PDF) para o contador da associação.

---

## RBAC por Relatório

| Relatório | Diretoria | Tesoureiro | Responsável Técnico | DPO | Auditor |
|---|---|---|---|---|---|
| SNGPC XML | Ver | — | Gerar + Ver | Ver | Ver |
| BSPO | Ver | — | Gerar + Ver | Ver | Ver |
| KPI Dashboard | Ver | Ver | Ver | Ver | Ver |
| DRE + Balanço | Ver | Gerar + Ver | — | — | Ver |
| Rastreabilidade Full | — | — | Gerar + Ver | Gerar + Ver | Ver |
| Relatório Judicial | Ver | — | — | Gerar + Ver | Ver |
| Audit Log | — | — | — | Gerar + Ver | Ver |

Permissões gerenciadas via tabela `role_permissions` — não hardcoded na aplicação.
