---
title: "Software Landscape Global"
description: "Mapeamento de todas as soluções existentes para gestão de associações/dispensários de cannabis — BR e internacional."
---

## OSS no GitHub

| Projeto | Stars | Stack | Licença | Observações |
|---|---|---|---|---|
| **openthc/pos** | 152 | PHP | GPL-3 | Point-of-sale US; hardcoded para regulação americana; data model referência |
| **openthc/api** | 81 | PHP | MIT | API spec com ULID data model — melhor referência open para schema de rastreabilidade |
| **cannlytics** | 77 | Python | MIT | Focado em analytics laboratorial; sem gestão de membros/dispensação |
| **dwot/isley** | 76 | Go | MIT | Journal pessoal de cultivo; sem multi-tenant, sem compliance |
| **GreenWerx** | 9 | C# | — | Abandonado; última atividade 2019 |

**Nenhum projeto OSS atende simultaneamente**: LGPD + SNGPC + self-hosted + multi-associação.

---

## Soluções Brasileiras

| Produto | Preço | Modelo | Destaque | Gap |
|---|---|---|---|---|
| **XURU** | R$0–R$1.599/mês | SaaS | Alinhado RDC 1.014; mais completo do BR | SaaS = LGPD risk; código fechado |
| **BudApp** | SaaS | SaaS | Gateway de pagamento Lytex integrado | Foco em pagamento, não compliance |
| **ComplySoft** | SaaS | SaaS | 50+ associações; NIC (Número de Identificação de Cultivo) por planta | SaaS; sem SNGPC confirmado |

---

## Internacional — Cannabis Social Clubs (CSC)

| Produto | Abrangência | Preço | Destaque | Aplicável a BR? |
|---|---|---|---|---|
| **Cannabis Club Systems** | 900+ clubes, 11 países, claim BR | €0,60/membro/mês | Maior escala global | Parcialmente — sem SNGPC, sem LGPD cert |
| **Gestión Verde** (ES) | Espanha | €50/mês (250 membros) | Simples, para CSC espanhol | Não — regulação incompatível |
| **Cannanas** (DE) | 600+ clubes, Alemanha | €1/membro/mês | IA "Hanna", domina >50% do mercado KCanG | Arquitetura referência; sem BR compliance |
| **GrowerIQ** (CA) | Canadá/internacional | — | ERP + QMS, suporte ao PT | Caro, over-engineered para associações |
| **420+** (DE) | Alemanha | — | On-premise disponível | Arquitetura interessante; sem SNGPC/LGPD |

---

## Commercial US — Referência de Arquitetura

Não aplicáveis ao mercado BR, mas são o gold standard de arquitetura:

| Produto | Preço | Modelo | O Que Aprender |
|---|---|---|---|
| **Metrc** | B2G | Gov | RFID seed-to-sale; API de rastreabilidade para reguladores |
| **Dutchie** | $1.500+/mês | SaaS | UX de dispensação; carrinho + integração de pagamento |
| **Flowhub** | $499+/mês | SaaS | Compliance workflow; audit trail; gestão de inventário |

---

## O Gap — Por Que Nenhum Serve

| Requisito | OSS (openthc) | XURU (BR) | Cannanas (DE) | Cannabis Club Systems |
|---|---|---|---|---|
| LGPD / dados sensíveis | Parcial | Desconhecido | Não aplicável | Não |
| SNGPC | Não | Em desenvolvimento | Não | Não |
| BSPO/CPC29 (boas práticas) | Não | Parcial | KCanG (equiv.) | Parcial |
| Self-hosted | Sim | Não | Não | Não |
| OSS (auditável) | Sim | Não | Não | Não |
| Multi-associação | Não | Sim | Sim | Sim |

**Nenhuma solução cobre LGPD + SNGPC + BSPO + CPC29 + self-hosted + OSS simultaneamente.**

---

## Por Que Self-Hosted Reduz Risco LGPD

Sob a **LGPD, Art. 5, II**, dados de saúde são **dados pessoais sensíveis** — exigem tratamento com base legal explícita e controle restrito.

Em um modelo SaaS clássico, a associação continua sendo controladora e o fornecedor é operador — desde que o contrato e a operação estejam corretamente desenhados. Self-hosted não é a única opção juridicamente válida. **É a opção com menor superfície de risco para a diretoria da associação.**

Self-hosted reduz:

- **Suboperadores**: SaaS típico usa CDN, hosting, observability, email — cada um é um operador adicional com cadeia de risco
- **Transferência internacional**: a maioria dos SaaS comerciais armazena dados fora do BR — exige BCRs ou cláusulas-padrão ANPD
- **Lock-in de dados sensíveis**: migração de SaaS para qualquer outro provedor (ou crypto-deletion) depende de cooperação do fornecedor
- **Superfície de vazamento**: um breach no fornecedor SaaS é breach de N associações simultaneamente — responsabilidade compartilhada com efeito sistêmico

O modelo recomendado pelo canna-oss: **a associação hospeda o software em infraestrutura sob seu controle** (servidor próprio ou managed hosting com contrato explícito de operador BR-only).

Cf. [Premissas Regulatórias](/regulatory-assumptions/) — esta tese está em **Prováveis**: self-hosted reduz superfície de risco LGPD para a diretoria. Não é declaração de que SaaS viola LGPD per se.
