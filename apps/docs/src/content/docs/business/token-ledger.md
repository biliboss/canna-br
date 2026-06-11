---
title: "Token-Ledger v0.1"
description: "Token desde o dia 1, especulação nunca; investimento só regulado. Contabilidade programável interna na v0.1 — produto financeiro só com estrutura regulada."
---

> **O token-ledger nasce na v0.1 como contabilidade programável. O investimento tokenizado nasce só depois, se e quando houver estrutura regulada. Token desde o dia 1, especulação nunca; investimento só regulado.**

Esta é a visão de negócio. Complementa [Infraeconomics](/business/tokenomics/): a associação não lucra com cannabis ([RDC 1.014/2026, Anvisa](https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2026/anvisa-publica-regras-para-producao-de-cannabis-medicinal)); a InfraCo monetiza a infraestrutura ao redor. O ledger é a peça que torna essa economia auditável desde o primeiro dia.

## Duas dimensões que não podem se misturar

A primeira é **arquitetura**. A segunda é **produto financeiro**. Confundir as duas é o erro que mata projetos desse tipo.

| Dimensão A — Ledger técnico (v0.1) | Dimensão B — Token de investimento (só regulado) |
| --- | --- |
| Posição econômica interna, permissionada | Ativo ofertado a terceiros com expectativa de retorno |
| Unidade contábil programável: saldo, cota, garantia, reputação, voto | Recebíveis tokenizados, pool de crédito, plantio com lucro, buyback |
| **Condições de segurança:** interno; não ofertado como investimento; sem promessa de rendimento; sem mercado secundário livre; sem APY; sem distribuição automática de lucro; lastro contábil claro | **Gatilhos regulatórios:** [CVM classifica criptoativos como valores mobiliários](https://www.gov.br/cvm/pt-br/acesso-a-informacao-cvm/perguntas-frequentes-da-cvm/criptoativos-quando-se-aplicam-as) pela substância econômica, não pelo nome — inclusive [tokens de recebíveis e renda fixa](https://www.gov.br/cvm/pt-br/assuntos/noticias/2023/cvm-orienta-sobre-caracterizacao-de-tokens-de-recebiveis-e-de-tokens-de-renda-fixa-como-valores-mobiliarios) |
| Risco baixo relativo | Oferta pública, suitability, KYC/AML, custódia, [Resolução BCB 520 (VASP/SPSAV)](https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?numero=520&tipo=Resolu%C3%A7%C3%A3o+BCB) |

## O que o usuário vê na v0.1

O usuário nunca vê "token", wallet, gas ou chain. Vê linguagem financeira simples.

| Função visível | Como mostrar | Backend | Condição de segurança |
| --- | --- | --- | --- |
| Saldo interno | "Saldo disponível: R$ 1.200" | `CREDIT` | Só para uso dentro da rede |
| Cota de compra coletiva | "Você tem 3 cotas no pedido de julho" | `PURCHASE_ORDER_SHARE` | Direito de compra/uso, não rendimento |
| Reserva de insumo/equipamento | "12h de equipamento reservadas" | `EQUIPMENT_USAGE_RIGHT` | Direito de uso, não participação em lucro |
| Garantia bloqueada | "Garantia bloqueada: R$ 3.000" | `ESCROW` | Apenas caução/colateral |
| Reputação | "Nível Ouro" | `REPUTATION_SBT` | Não transferível |
| Governança operacional | "Vote na próxima compra coletiva" | `GOVERNANCE_RIGHT` | Voto sobre operação, não lucro |
| Extrato | "Crédito usado / cota criada / garantia liberada" | eventos do ledger | Sem expectativa de investimento |
| Economia gerada | "Você economizou R$ 740" | `SAVINGS_EVENT` | Economia, não rendimento financeiro |

**Não pode aparecer na v0.1:** comprar token para investir, APY, rentabilidade projetada, participação em juros/recebíveis, token de plantio com retorno, token negociável, promessa de recompra, "ganhe com valorização", "receba dividendos". Buyback é conceito interno futuro — fora da copy pública.

## Tipos de token

| Token | Função | Visível como | Status v0.1 |
| --- | --- | --- | --- |
| `CREDIT` | Saldo interno, transferível só dentro da rede | "Saldo" | Ativo |
| `PO_SHARE` | Cota de compra coletiva | "Cota/pedido" | Ativo |
| `ESCROW` | Garantia bloqueada, não transferível | "Garantia" | Ativo |
| `REPUTATION` | Reputação da associação, não transferível | "Nível/score" | Ativo |
| `GOVERNANCE` | Voto operacional, não financeiro | "Votação" | Ativo |
| `SAVINGS` | Economia gerada — evento, não saldo resgatável | "Economia" | Ativo |
| `FEE` | Taxa de serviço da InfraCo | Extrato | Ativo |
| `LOAN_POOL_SHARE`, `RECEIVABLE_SHARE`, `YIELD_RIGHT`, `PLANTING_INVESTMENT_POSITION`, `BUYBACK_RIGHT`, `SECONDARY_MARKET_TOKEN` | Qualquer posição com retorno financeiro | — | **Bloqueados até versão regulada** |

## Roadmap v0.1 → v0.8

Sem corrida para v1.0: só minors — cada minor entrega valor real e compõe sobre o anterior.

Trilhas independentes — este roadmap (produto/rede) e o da [camada de pessoas](/business/dao/) (v0.1 → v0.5) evoluem em paralelo, sem sincronização de versões.

| Versão | Entrega-chave | Receita | Risco |
| --- | --- | --- | --- |
| **v0.1** | Token-ledger interno + OSS operacional: saldos, cotas, garantias, reputação básica, extrato | Setup + hosting + suporte + compliance básico | safe |
| **v0.2** | Compras coletivas: pedido coletivo, cotas, pagamento de fornecedor, economia gerada | Assinatura + fee de gestão de compras | safe |
| **v0.3** | Risco e cobrança: limite interno, score, cronograma, bloqueio, provisão simples | Risk fee + servicing fee + cobrança | safe |
| **v0.4** | InfraCo escalável: multi-tenant, SLA, agentes MCP, compliance pack, dashboards | MRR por associação | safe |
| **v0.5** | Liquidação fiat/USDT **via parceiro regulado** — nunca improvisar exchange/custódia | Fee de liquidação + conciliação | caution |
| **v0.6** | Reputação e governança operacional: níveis, votações, orçamento | Assinatura + módulos | safe |
| **v0.7** | Crédito estruturado fechado: pools privados, suitability/KYC/KYB | Estruturação + relatórios de risco | caution |
| **v0.8** | Token financeiro regulado: recebíveis, pool, retorno, eventual mercado secundário | Estruturação + gestão + servicing | regulated |

## Estrutura societária mínima

v0.1 = **uma única empresa: InfraCo Brasil LTDA** (tecnologia e serviços). Sem FinanceCo, Foundation ou AuditCo no dia 1.

| Objeto social — permitido | Objeto social — evitar |
| --- | --- |
| Desenvolvimento, licenciamento e hospedagem de software; suporte; implantação; consultoria; integração; automação; análise de dados; treinamento; gestão operacional de compras coletivas | Intermediação financeira; custódia de criptoativos; câmbio; concessão de crédito; captação de recursos; administração de carteira; distribuição de valores mobiliários |

Entidades futuras nascem por gatilho, não por antecipação:

```text
v0.1  InfraCo LTDA única           — software, hosting, suporte, ledger interno
v0.4  Parceiros externos           — auditoria terceirizada, jurídico
v0.5  FinanceCo ou parceiro regulado — liquidação fiat/USDT, crédito, recebíveis
v0.6  OSS Foundation (opcional)    — governança do OSS, contributors, grants
v0.7  AuditCo / auditor independente — prova de lastro, certificação
v0.8  Veículo regulado de investimento — pools, recebíveis, retorno financeiro
```

## Exemplo: compra coletiva

10 associações; pedido de R$ 100.000; Associação A participa com R$ 10.000; fee de 3%; desconto negociado de 12%.

| Frontend (Associação A) | Ledger (backend) |
| --- | --- |
| Pedido coletivo #008 | `CreditIssued: R$ 10.000` |
| Sua cota: R$ 10.000 | `PurchaseOrderShareIssued: R$ 10.000` |
| Taxa de gestão: R$ 300 | `FeeCharged: R$ 300` |
| Economia estimada: R$ 1.200 | `SupplierPaymentReserved: R$ 9.700` |
| Status: aguardando pagamento do fornecedor | `SavingsRecorded: R$ 1.200` |

O usuário não comprou investimento. Comprou cota operacional de compra coletiva.

## Exemplo: reputação

Associação paga em dia, mantém rastreabilidade, sem inconsistência de estoque. Frontend: **Nível Ouro** → limite maior em compras, menor garantia exigida, prioridade em pedidos coletivos. Backend: `ReputationUpdated, score: 87, token_type: REPUTATION, transferability: non_transferable`. Reputação não pode ser vendida — reduz risco sem virar ativo financeiro.

## Backlog v0.1 — 6 semanas

| Semana | Entrega |
| --- | --- |
| 1 | Fundação: InfraCo LTDA, contrato padrão, termos do ledger, política "token não é investimento", boundaries [AGPL](https://www.gnu.org/licenses/agpl-3.0.en.html)/comercial |
| 2 | Ledger: tipos de token, idempotência, projeção de saldos, extrato, checkpoint hash |
| 3 | Integração OSS: mapear eventos do core, outbox, posições econômicas |
| 4 | Compras coletivas: pedido coletivo, `PO_SHARE`, reserva de saldo, fee, economia |
| 5 | Reputação/governança: `REPUTATION` não transferível, votação simples, score por regras |
| 6 | Compliance e piloto: KYB básico, [LGPD](https://www.gov.br/esporte/pt-br/acesso-a-informacao/lgpd)/acesso, auditoria de eventos, piloto 1–3 associações, primeiras cobranças |

## Frase-mãe

> **Desde a v0.1, toda posição econômica da rede nasce como token interno no backend. Mas nenhum token é vendido como investimento. O usuário vê saldo, cotas, garantias, reputação, extrato e governança operacional. A infraestrutura monetiza software, suporte, compliance, compras, risco, cobrança e liquidação — enquanto qualquer retorno financeiro, recebível ou pool fica travado até estrutura regulada existir.**

## Stack

Implementação técnica (NATS JetStream + ledger engine + SurrealDB, conforme ADR-003) em [Token-Ledger (arquitetura)](/architecture/token-ledger/). Veja também [Infraeconomics](/business/tokenomics/) e [DAO & economia de contribuição](/business/dao/).
