---
title: "Chain of Custody — ULID"
description: "Rastreabilidade semente→dispensação via ULID permanente. Baseado em OpenTHC MIT."
---

## Diagrama da Chain

Cada planta tem um ULID atribuído no momento da germinação. Esse identificador acompanha o material vegetal até a dispensação final, passando por todos os estágios intermediários:

```
cultivation_batch (ULID)
  └── plants[] (ULID permanente — tag física impressa)
        └── harvest_batches (ULID)
              └── processing_runs (ULID)
                    └── lab_samples (ULID) → laudo PDF no MinIO
                          └── inventory_lots (ULID)
                                └── dispensations (ULID)
                                      └── SNGPC XML (por dispensação + batch diário)
```

Cada seta representa uma relação de rastreabilidade auditável. Nenhum material entra no estoque sem ter um `inventory_lot` ligado a um `harvest_batch`, que por sua vez está ligado a `plants` com ULIDs permanentes.

---

## Por Que ULID

| Critério | UUID v4 | Auto-increment INT | ULID |
|---|---|---|---|
| Sortable por tempo | Não | Sim (sequencial) | **Sim** |
| Globalmente único | Sim | Não (por DB) | **Sim** |
| URL-safe | Parcial (hífens) | Sim | **Sim** |
| Sem coordenação de servidor | Sim | Não | **Sim** |
| Legível por humanos | Não | Sim | **Parcial** |
| Collision probability (80 bits) | 2^122 | N/A | **2^80** |

**ULID escolhido por:**

1. **Sortable por tempo** — relatórios cronológicos sem `ORDER BY created_at` extra em índices compostos
2. **Globalmente único sem coordenação** — múltiplos workers podem gerar ULIDs em paralelo sem sequência centralizada
3. **URL-safe** — IDs aparecem em URLs administrativas e tags QR impressas
4. **Auditável visualmente** — os primeiros 10 caracteres codificam o timestamp, facilitando investigação manual

---

## Plant ULID — Identidade Física + Digital

O ULID da planta é gerado no registro do `cultivation_batch` e atribuído a cada `plant` individualmente. Esse mesmo ULID é:

1. Armazenado no banco de dados como chave primária imutável
2. **Impresso em tag física** (QR code ou código de barras) fixada na planta
3. Usado para rastrear todas as transformações subsequentes do material

```
plant.id = "01HQ7XKZM3N4P5Q6R7S8T9V0W"
           ↕
Tag física: QR → /plants/01HQ7XKZM3N4P5Q6R7S8T9V0W
```

**Regra absoluta:** Plant ULID nunca é reutilizado, mesmo após destruição documentada da planta. Registros de destruição referenciam o ULID original.

---

## Audit Log Imutável

O audit log é imutável na **camada de banco de dados**, não na camada de aplicação. Nenhum código de aplicação pode apagar ou alterar entradas de auditoria.

### PostgreSQL RULE bloqueando UPDATE/DELETE

```sql
-- Tabela de audit log
CREATE TABLE audit_log (
  id          ULID PRIMARY KEY DEFAULT gen_ulid(),
  table_name  TEXT NOT NULL,
  record_id   TEXT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data    JSONB,
  new_data    JSONB,
  actor_id    ULID REFERENCES users(id),
  actor_role  TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address  INET,
  session_id  TEXT
);

-- Bloquear UPDATE na audit_log
CREATE RULE audit_log_no_update AS
  ON UPDATE TO audit_log
  DO INSTEAD NOTHING;

-- Bloquear DELETE na audit_log
CREATE RULE audit_log_no_delete AS
  ON DELETE TO audit_log
  DO INSTEAD NOTHING;

-- Revogar permissão de TRUNCATE do role da aplicação
REVOKE TRUNCATE ON audit_log FROM app_role;
```

Adicionalmente, pgAudit registra eventos DDL diretamente nos logs do PostgreSQL, criando uma segunda camada de auditoria fora do alcance da aplicação.

---

## Principais Entidades

### Identificação de Variedade via StrainCatalog

O campo `strain_id` em `cultivation_batch` referencia um UUID canônico do futuro [StrainCatalog](/research/strain-databases/) — bounded context separado, baseado em UUIDs interop OpenTHC/vdb. Sem esse identificador consistente, auditoria de rastreabilidade por variedade (exigida pela RDC 1.014) depende de nomenclatura livre por associação, inviabilizando comparações e relatórios federados.

---

### `cultivation_batch`

| Campo | Tipo | Descrição |
|---|---|---|
| id | ULID PK | Identificador do lote de cultivo |
| strain_id | ULID FK | Cepa (genetics) |
| start_date | DATE | Data de plantio |
| expected_plants | INT | Quantidade planejada |
| grow_medium | TEXT | Substrato (coco, terra, hidro) |
| location_id | ULID FK | Área de cultivo |
| status | ENUM | seedling / vegetative / flowering / harvested |

### `plants`

| Campo | Tipo | Descrição |
|---|---|---|
| id | ULID PK | **Permanente. Nunca reutilizar.** |
| batch_id | ULID FK | cultivation_batch de origem |
| tag_printed_at | TIMESTAMPTZ | Quando tag física foi impressa |
| destroyed_at | TIMESTAMPTZ | NULL se viva, timestamp se destruída |
| destruction_reason | TEXT | Doença, pragas, voluntária |

### `harvest_batches`

| Campo | Tipo | Descrição |
|---|---|---|
| id | ULID PK | Identificador do lote de colheita |
| plant_ids | ULID[] | Plantas colhidas neste lote |
| harvest_date | DATE | Data de colheita |
| wet_weight_g | DECIMAL(10,2) | Peso úmido total (g) |
| dry_weight_g | DECIMAL(10,2) | Peso seco após cura (g) |
| thc_percentage | DECIMAL(5,2) | Resultado do lab (pode ser NULL antes do laudo) |
| cbd_percentage | DECIMAL(5,2) | Resultado do lab |

### `inventory_lots`

| Campo | Tipo | Descrição |
|---|---|---|
| id | ULID PK | Identificador do lote de estoque |
| processing_run_id | ULID FK | Processamento de origem |
| product_type | ENUM | flower / oil / extract / capsule |
| quantity_g | DECIMAL(10,2) | Quantidade em estoque (decrementada por dispensações) |
| available_from | DATE | Não dispensar antes desta data |
| expires_at | DATE | Validade |

### `dispensations`

| Campo | Tipo | Descrição |
|---|---|---|
| id | ULID PK | Identificador da dispensação |
| member_id | ULID FK | Membro que recebeu |
| lot_id | ULID FK | inventory_lot de origem |
| quantity_g | DECIMAL(10,2) | Quantidade dispensada |
| dispensed_at | TIMESTAMPTZ | Timestamp exato (usado no SNGPC XML) |
| dispensed_by | ULID FK | Usuário responsável |
| prescription_id | ULID FK | Prescrição médica vinculada |
| sngpc_batch_id | TEXT | ID do batch SNGPC enviado |
