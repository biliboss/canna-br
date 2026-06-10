---
title: "Revenue Model"
description: "Self-host grátis (AGPL) + managed hosting pago. 80% gross margin. R$107k → R$604k → R$1.87M ARR em 3 anos."
---

## Modelo Base

```
Self-host (AGPL)          → Grátis para sempre
Managed hosting           → Pago (infra + suporte + SLA)
Professional services     → Limitado (hard limit: max 20% receita)
```

A divisão é simples: o código é livre, a conveniência é paga. Associações que têm capacidade técnica fazem self-host. Associações que não têm (maioria) pagam pelo managed hosting.

---

## Planos Managed Hosting

| Plano | Preço/mês | Limite Membros | SLA | Suporte |
|---|---|---|---|---|
| **Starter** | R$ 297 | Até 50 membros | 99% uptime | Email (48h) |
| **Standard** | R$ 597 | Até 200 membros | 99.5% uptime | Email (24h) + Chat |
| **Enterprise** | R$ 1.197 | Ilimitado | 99.9% uptime + SLA escrito | Telefone + dedicado |

### O Que Está Incluso em Todos os Planos

- Sistema completo (cultivo, membros, dispensação, financeiro)
- SNGPC XML automático
- BSPO gerado automaticamente
- Backups diários (Restic → S3 cifrado)
- TLS automático (Caddy)
- Atualizações automáticas
- Domínio próprio da associação (`app.suaassociacao.com.br`)

### Enterprise Adicional

- SLA com penalidade contratual
- Customização de white-label
- Treinamento presencial (1x/ano)
- Migração de dados de sistema anterior
- Contrato formal com DPA LGPD pré-assinado

---

## Estrutura de Custos

### Infra por Tenant (schema isolation)

```
PostgreSQL schema isolado:  R$ 20–30/mês (instância compartilhada)
MinIO storage (laudos/docs): R$ 15–25/mês (estimativa 10 GB/mês)
Redis (cache + BullMQ):      R$ 10/mês (compartilhado)
Backup Restic:               R$ 5–10/mês (S3 Hetzner)
Caddy + rede:                R$ 5/mês
Monitoramento:               R$ 5/mês
────────────────────────────────────
Total estimado:              R$ 60–85/mês por tenant
```

**Gross margin por plano:**

| Plano | Receita | Custo Infra | Gross Margin |
|---|---|---|---|
| Starter R$297 | R$297 | R$80 | **73%** |
| Standard R$597 | R$597 | R$100 | **83%** |
| Enterprise R$1.197 | R$1.197 | R$120 | **90%** |
| Média ponderada | — | — | **~80%** |

---

## Projeções ARR

### Premissas

- SAM (Serviceable Addressable Market): ~315 associações potenciais pagas (40% dos 400+ clientes potenciais optam por managed hosting)
- Churn mensal: 2% (equivalente a ~22% anual — conservador para nicho regulado)
- Mix de planos: 50% Starter / 35% Standard / 15% Enterprise
- Ticket médio ponderado: R$515/mês

### Mês 12 — R$107k ARR

```
~20 associações managed
Mix: 10 Starter + 7 Standard + 3 Enterprise
Ticket médio: ~R$448/mês
MRR: ~R$8.9k → ARR: R$107k
```

Foco: FACT deal (36 associações via 1 contrato — 20 managed + 16 self-host).

### Mês 24 — R$604k ARR

```
~80 associações managed
Mix: 40 Starter + 28 Standard + 12 Enterprise
Ticket médio: ~R$629/mês
MRR: ~R$50.3k → ARR: R$604k
```

Catalisador: associações aprovadas no sandbox ANVISA (primeiras aprovações: mar/27).

### Mês 36 — R$1.87M ARR

```
~120 associações managed (~38% do SAM)
Mix: 55 Starter + 45 Standard + 20 Enterprise
Ticket médio: ~R$657/mês (upsell Standard→Enterprise com renovação contrato)
MRR: ~R$156k → ARR: R$1.87M
```

A 120 associações, o produto é autossustentável com equipe de 4–6 pessoas (benchmark Plausible: 8 pessoas / $3.1M ARR).

---

## FACT Deal

A FACT (Federação das Associações Cannabis Terapêutica) representa 36 associações membros. Um contrato federação permite:

```
Modelo A — Per Association
  36 associações × R$297/mês Starter = R$10.692/mês
  Desconto federação: 15% = R$9.088/mês → R$109k ARR

Modelo B — Fixed + Per Member
  R$1.500/mês fixo (suporte federação + dashboard consolidado)
  + R$8/membro/mês (média 40 membros/associação = R$320/assoc)
  36 associações × R$320 = R$11.520 + R$1.500 = R$13.020/mês → R$156k ARR
```

**Modelo B preferido:** alinha incentivos (canna-oss ganha quando a associação cresce em membros) e é mais previsível para a FACT (preço fixo de base).

O dashboard consolidado federação (view agregada across todas as 36 associações) é o diferencial do contrato — não está disponível no plano Starter individual.
