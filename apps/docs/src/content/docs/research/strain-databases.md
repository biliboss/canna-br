---
title: Strain Databases & StrainCatalog
description: Fontes abertas de dados de strains, onde entra no canna-br, arquitetura do bounded context e decisão de posicionamento.
---

## Fontes Abertas

| Fonte | Volume | Licença | Dados | `fonte_do_dado` |
|---|---|---|---|---|
| [strain-database](https://github.com/nicholasgasior/strain-database) | 51.700+ strains, 1.820+ breeders, 35.800+ relações genéticas | Open access | Genética, linhagem, breeders, UUIDs | `strain-database/github` |
| [Kushy Dataset](https://github.com/kushyapp/kushy-dataset) | ~2.000 strains + produtos/marcas/lojas | MIT | Strain, tipo, efeitos, sabores, lab results | `kushy/github` |
| cannabis.csv (Kaggle) | ~2.350 strains | Open data | Nome, tipo, rating, efeitos, sabores (scrape Leafly) | `kaggle/cannabis-csv` |
| [OpenTHC/vdb](https://github.com/openthc/vdb) | Menor, IDs padronizados | GPL-3.0 | UUIDs interop entre sistemas cannabis | `openthc/vdb` |
| [Cannlytics](https://github.com/cannlytics/cannlytics) | Lab results vários estados US | MIT | THC, CBD, terpenos, resultados analíticos reais | `cannlytics/github` |
| API 43k strains (2026) | 43.000+ | Freemium (100 req/dia) | Efeitos, terpenos %, canabinoides, condições médicas, linhagem | `cannabis-reports-api` |
| Mendeley Dataset | 800+ | Open (DOI) | Perfis subjetivos × composição química | `mendeley/doi` |

GPL-3.0 (OpenTHC/vdb) compatível com AGPL do core canna-br. MIT (Kushy, Cannlytics) sem atrito. Registrar `fonte_do_dado` por linha = compliance de atribuição.

---

## Onde Entra no canna-br

| Touchpoint | Papel do StrainCatalog |
|---|---|
| [Chain of Custody](/architecture/chain-of-custody/) | `strain_id` canônico em `cultivation_batch` — identidade da variedade semente→dispensação. Sem ID consistente, auditoria de rastreabilidade por variedade é impossível. |
| [SNGPC](/research/sngpc/) | Movimentação registrada por produto; ID aberto evita divergência de nomenclatura entre associações no mesmo lote de submissão. |
| RDC 1.014/2026 | Rastreabilidade por variedade exigida; catálogo de referência = evidência de processo pra ANVISA. |
| Agente AI (Mel) | Perfis canabinoides/terpenos = base de recomendação personalizada ao associado via MCP. |

---

## Arquitetura do Bounded Context

```text
StrainCatalog (bounded context separado do ledger)
  ├── strain_id        UUID, base OpenTHC/vdb — chave de interop
  ├── nome_comum       ex: "Charlotte's Web"
  ├── nome_científico  ex: Cannabis sativa L.
  ├── tipo             indica | sativa | hybrid | cbd
  ├── canabinoides     THC%, CBD%, CBG% (quando disponível)
  ├── terpenos         perfil (quando disponível)
  ├── linhagem         parent strains (refs por strain_id)
  └── fonte_do_dado    auditoria da origem (ver tabela acima)

Consumidores (leitura apenas):
  Chain of Custody ──► strain_id em cultivation_batch
  SNGPC adapter   ──► nome canônico por strain_id
  Agente AI (Mel) ──► canabinoides + terpenos pra recomendação
```

Nunca acoplado à contabilidade. Nunca recebe events do ledger. Expõe apenas leitura.

---

## Decisão

**Não criar do zero.** Estratégia de seed:

1. **OpenTHC/vdb** — UUIDs de interop. Base do `strain_id` canônico.
2. **Kushy** — efeitos + lab results + tipos (MIT, sem atrito).
3. **strain-database** — linhagem genética quando associações cultivarem variedades próprias (51k+ strains, breeders, relações).

Posicionamento: **primeiro catálogo de strains com foco medicinal e regulatório BR** — diferencial de produto + argumento de confiança junto à ANVISA.

---

## Caveat

Datasets majoritariamente recreacionais US (Leafly/Weedmaps scrapes). Contexto medicinal BR sob RDC 1.014 é diferente: perfis de uso, condições médicas e concentrações relevantes divergem do mercado recreacional. **Curadoria medicinal BR é o trabalho real — e o diferencial competitivo.**

---

## Gatilho de Implementação

Ver [Roadmap](/roadmap/) — entrada no Ideas Park com gatilho explícito: implementação do [Chain of Custody](/architecture/chain-of-custody/) OU primeira associação piloto cultivando variedade própria. Não prioriza sobre minors em curso.
