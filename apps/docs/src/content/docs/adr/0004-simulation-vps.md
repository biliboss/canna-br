---
title: "ADR-004 — Simulacao em VPS Dedicada"
description: "Nova VPS para simular canna-br stack pivot sem tocar fleet interna (Langfuse + Surreal + NATS production)"
---

# ADR-004 — Simulacao em VPS Dedicada

| Campo | Valor |
|---|---|
| Status | **Proposed** (2026-06-09) |
| Data | 2026-06-09 |
| Versao | v0.1.0 |
| Substitui | — |
| Relacionado | [ADR-003 — Stack Pivot NATS + SurrealDB + DBOS](/adr/0003-stack-pivot-nats-surreal-dbos/) |

## Contexto

### Fleet atual saturada

A VPS interna (Contabo) ja executa:

| Servico | RAM estimada |
|---|---|
| Langfuse v3 (PG + ClickHouse + MinIO + web + worker) | ~4-5 GB |
| SurrealDB 3.x (surrealkv) | ~300 MB |
| NATS JetStream 2.10.29 | ~150 MB |
| canna-br apps (mcp-server + api + worker) | ~400 MB |
| Sistema + buffers | ~1 GB |
| **Total estimado** | **~6-7 GB de 8 GB disponivel** |

Margem livre: ~1 GB. Nao e suficiente para adicionar DBOS (requer Postgres dedicado ~300-500 MB + overhead do runtime) sem risco de OOM que afete Langfuse — servico de producao critico.

### ADR-003 requer DBOS Postgres dedicado

Conforme Risco 2 do ADR-003, DBOS nao compartilha instancia Postgres com a aplicacao. Precisa de Postgres proprio para seu state store interno. Na fleet atual, isso nao cabe sem comprometer servicos existentes.

### Modo de entrega atual: planning + simulacao

canna-br em 2026-06-09 esta em `feature/mcp-first-pivot` — branch nao mergeada em `main`. O deliverable atual e:

1. Planning docs (ADRs, roadmap, arquitetura)
2. Simulacao do stack pivot em ambiente isolado
3. Validacao do `emmett-nats` adapter (gate de concorrencia)

Nao e SaaS multi-tenant pago em producao. Portanto, a simulacao pode (e deve) rodar em VPS dedicada separada, sem risco para a fleet de producao.

### Restricao BSL SurrealDB

SurrealDB 3.x usa Business Source License (BSL 1.1). A restricao central e: nao pode ser usado como **DBaaS gerenciado pago para terceiros** (oferecer SurrealDB como servico a clientes). Uso interno (rodar SurrealDB para servir a propria aplicacao canna-br) e permitido pela BSL — nao e DBaaS. Uma VPS dedicada para canna-br nao viola a BSL independente de quantas associacoes a aplicacao gerencia, porque o SurrealDB serve a aplicacao, nao os clientes diretamente como produto de banco de dados.

## Decisao

Provisionar **VPS dedicada nova** exclusivamente para canna-br simulacao e desenvolvimento do stack pivot (ADR-003). A fleet interna permanece intocada.

### O que roda na VPS dedicada

| Servico | Proposito |
|---|---|
| NATS JetStream | Event store/bus para `emmett-nats` adapter |
| SurrealDB 3.x | Read models graph-native |
| DBOS Postgres | State store do DBOS Workflows |
| canna-br apps | mcp-server + api + worker |
| Traefik | Reverse proxy + TLS automatico |

### O que NAO muda

- Fleet interna — Langfuse, SurrealDB prod, NATS prod: **intocados**
- canna-br.fonsecagabriel.com.br — pode apontar para VPS nova ou redirecionar (decidir antes de provisionar)
- Branch `feature/mcp-first-pivot` — continua como base de desenvolvimento

### Hostname

Duas opcoes para subdominio da simulacao:

| Opcao | Host | Semantica |
|---|---|---|
| A | `canna-sim.fonsecagabriel.com.br` | Explicito que e simulacao |
| B | `canna.lab.fonsecagabriel.com.br` | Lab namespace, mais limpo |

**Preferencia**: Opcao B — `canna.lab.fonsecagabriel.com.br`. O namespace `.lab.` deixa claro que e ambiente de desenvolvimento/simulacao sem implicar "sim" (que pode confundir com "simples" ou servico ativo).

A decisao final fica com o mantenedor no momento de provisionar.

### Specs recomendados

**Contabo Cloud VPS M**:

| Especificacao | Valor |
|---|---|
| RAM | 16 GB |
| vCPU | 6 |
| SSD | 100 GB NVMe |
| Custo | ~€10/mes |
| Regiao | EU (LGPD-compativel, dados de saude) |

Justificativa do tamanho M (nao S):

| Servico | RAM estimada VPS nova |
|---|---|
| NATS JetStream | ~150 MB |
| SurrealDB 3.x | ~500 MB |
| DBOS Postgres | ~500 MB |
| canna-br apps (mcp + api + worker) | ~600 MB |
| Traefik | ~50 MB |
| SO + buffers + headroom | ~2 GB |
| **Total** | **~3.8 GB** |

VPS S (8 GB) comportaria o stack atual, mas sem margem para picos de memoria durante testes de carga ou adicao de novos servicos. VPS M (16 GB) oferece headroom confortavel para a fase de simulacao e possivel expansao para multi-tenant lite.

### Kamal deploy pattern

Reutilizar o pattern `feedback-mukutu-coolify-deploy` adaptado para Kamal v2 direto (sem Coolify — mais controle para simulacao):

```yaml
# kamal/config/deploy-sim.yml (a criar)
service: canna-sim
image: ghcr.io/seu-org/canna-br
servers:
  web:
    hosts: [<IP-VPS-NOVA>]
    labels:
      traefik.http.routers.canna-sim.rule: Host(`canna.lab.fonsecagabriel.com.br`)
accessories:
  nats:
    image: nats:2.10-alpine
    ...
  surreal:
    image: surrealdb/surrealdb:v3
    ...
  dbos-pg:
    image: postgres:16-alpine
    ...
```

SSH access via IP (nao hostname) — padrao Kamal v2 conforme `feedback-kamal-v2-gotchas`.

## Implicacoes

### Positivas

- Fleet de producao Langfuse + SurrealDB + NATS permanece estavel e sem risco de OOM
- `emmett-nats` adapter pode ser testado com carga real sem afetar servicos criticos
- DBOS Workflows podem ser validados end-to-end para sagas SNGPC
- Custo previsivel (~€10/mes) enquanto em fase de simulacao; VPS pode ser desligada ou downscalada apos merge do stack pivot
- Isolamento completo: qualquer instabilidade durante desenvolvimento nao afeta Langfuse

### Negativas

- Custo adicional de ~€10/mes (VPS M Contabo)
- Necessidade de manter duas configuracoes Kamal (fleet prod + sim)
- DNS adicional para gerenciar (`canna.lab.*`)
- Onboarding de novos contribuidores precisa documentar qual ambiente usar

### Nao-implicacoes (o que esta ADR NAO decide)

- Quando fazer merge de `feature/mcp-first-pivot` em `main` — separado, depende dos gates do ADR-003
- Se `canna-br.fonsecagabriel.com.br` (atual) aponta para VPS nova ou permanece na fleet — decidir antes de provisionar
- Arquitetura multi-tenant para SaaS pago — fora de escopo desta VPS de simulacao
- SSPL vs AGPL do SurrealDB para uso SaaS futuro — separado, ver Risco BSL no ADR-003

## Criterio de conclusao (done-when)

- [ ] VPS provisionada (Contabo Cloud VPS M, regiao EU)
- [ ] DNS `canna.lab.fonsecagabriel.com.br` apontando para IP da VPS
- [ ] Kamal config `deploy-sim.yml` criado e validado
- [ ] NATS JetStream rodando e acessivel via SSH tunnel local
- [ ] SurrealDB 3.x rodando e acessivel via SSH tunnel local
- [ ] DBOS Postgres rodando e DBOS CLI conectando
- [ ] `emmett-nats` spike PASS (gate de concorrencia: duas dispensacoes concorrentes → apenas uma passa)
- [ ] canna-br apps (mcp-server + api) deployados e respondendo em HTTPS

## Referencias

- ADR-003 — Stack Pivot NATS + SurrealDB + DBOS: `/adr/0003-stack-pivot-nats-surreal-dbos/`
- feedback-mukutu-coolify-deploy — pattern VPS + Traefik + deploy tar-pipe
- feedback-kamal-v2-gotchas — SSH via IP, deploy_timeout 240, image sem tag
- project-surrealdb-fonsecagabriel — instancia SurrealDB em producao (nao tocar)
- project-nats-fonsecagabriel — instancia NATS em producao (nao tocar)
- project-langfuse — Langfuse na VPS interna (nao tocar)
- feedback-posthog-vps-undersized — lição aprendida: pre-flight `free -h` antes de adicionar servicos em VPS compartilhada
- Contabo Cloud VPS pricing — https://www.contabo.com/en/vps/cloud-vps/
- DBOS docs — https://docs.dbos.dev
