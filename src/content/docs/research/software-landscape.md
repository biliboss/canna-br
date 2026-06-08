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

## Por Que SaaS é Risco Jurídico

Sob a **LGPD, Art. 5, II**, dados de saúde são **dados pessoais sensíveis** — exigem tratamento com base legal explícita e controle restrito.

Em um modelo SaaS, o **controlador dos dados é o fornecedor do software**, não a associação. Isso viola:
- O dever fiduciário da associação para com seus membros-pacientes
- A exigência regulatória de que a associação seja responsável pela rastreabilidade e segurança das informações

O modelo correto: **a associação é o controlador** — o software deve ser hospedado pela própria associação (self-hosted) ou em infraestrutura sob seu controle exclusivo.
