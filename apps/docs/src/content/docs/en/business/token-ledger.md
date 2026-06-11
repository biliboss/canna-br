---
title: "Token-Ledger v0.1"
description: "Token from day 1, speculation never; investment only when regulated. Internal programmable accounting in v0.1 — financial product only with a regulated structure."
---

> **The token-ledger is born in v0.1 as programmable accounting. Tokenized investment is born only later, if and when a regulated structure exists. Token from day 1, speculation never; investment only when regulated.**

This is the business vision. It complements [Infraeconomics](/en/business/tokenomics/): the association does not profit from cannabis ([RDC 1.014/2026, Anvisa](https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2026/anvisa-publica-regras-para-producao-de-cannabis-medicinal)); the InfraCo monetizes the infrastructure around it. The ledger is the piece that makes this economy auditable from day one.

## Two dimensions that must not mix

The first is **architecture**. The second is **financial product**. Confusing the two is the mistake that kills projects of this kind.

| Dimension A — Technical ledger (v0.1) | Dimension B — Investment token (regulated only) |
| --- | --- |
| Internal, permissioned economic position | Asset offered to third parties with expectation of return |
| Programmable accounting unit: balance, share, collateral, reputation, vote | Tokenized receivables, credit pool, profit-bearing cultivation, buyback |
| **Safety conditions:** internal; not offered as investment; no promise of yield; no free secondary market; no APY; no automatic profit distribution; clear accounting backing | **Regulatory triggers:** [CVM classifies crypto assets as securities](https://www.gov.br/cvm/pt-br/acesso-a-informacao-cvm/perguntas-frequentes-da-cvm/criptoativos-quando-se-aplicam-as) by economic substance, not by name — including [receivables and fixed-income tokens](https://www.gov.br/cvm/pt-br/assuntos/noticias/2023/cvm-orienta-sobre-caracterizacao-de-tokens-de-recebiveis-e-de-tokens-de-renda-fixa-como-valores-mobiliarios) |
| Relatively low risk | Public offering, suitability, KYC/AML, custody, [BCB Resolution 520 (VASP/SPSAV)](https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?numero=520&tipo=Resolu%C3%A7%C3%A3o+BCB) |

## What the user sees in v0.1

The user never sees "token", wallet, gas, or chain. They see simple financial language.

| Visible function | How to display | Backend | Safety condition |
| --- | --- | --- | --- |
| Internal balance | "Available balance: R$ 1,200" | `CREDIT` | For use within the network only |
| Collective purchase share | "You have 3 shares in the July order" | `PURCHASE_ORDER_SHARE` | Right to purchase/use, not yield |
| Supply/equipment reservation | "12h of equipment reserved" | `EQUIPMENT_USAGE_RIGHT` | Right of use, not profit participation |
| Locked collateral | "Locked collateral: R$ 3,000" | `ESCROW` | Deposit/collateral only |
| Reputation | "Gold Level" | `REPUTATION_SBT` | Non-transferable |
| Operational governance | "Vote on the next collective purchase" | `GOVERNANCE_RIGHT` | Vote on operations, not profit |
| Statement | "Credit used / share created / collateral released" | ledger events | No investment expectation |
| Savings generated | "You saved R$ 740" | `SAVINGS_EVENT` | Savings, not financial yield |

**Must not appear in v0.1:** buying tokens to invest, APY, projected returns, participation in interest/receivables, cultivation token with return, tradable token, buyback promise, "earn with appreciation", "receive dividends". Buyback is a future internal concept — out of public copy.

## Token types

| Token | Function | Visible as | v0.1 status |
| --- | --- | --- | --- |
| `CREDIT` | Internal balance, transferable only within the network | "Balance" | Active |
| `PO_SHARE` | Collective purchase share | "Share/order" | Active |
| `ESCROW` | Locked collateral, non-transferable | "Collateral" | Active |
| `REPUTATION` | Association reputation, non-transferable | "Level/score" | Active |
| `GOVERNANCE` | Operational vote, not financial | "Voting" | Active |
| `SAVINGS` | Savings generated — event, not redeemable balance | "Savings" | Active |
| `FEE` | InfraCo service fee | Statement | Active |
| `LOAN_POOL_SHARE`, `RECEIVABLE_SHARE`, `YIELD_RIGHT`, `PLANTING_INVESTMENT_POSITION`, `BUYBACK_RIGHT`, `SECONDARY_MARKET_TOKEN` | Any position with financial return | — | **Blocked until regulated version** |

## Roadmap v0.1 → v0.8

No race to v1.0: minors only — each minor ships real value and compounds on the previous one.

Independent tracks — this roadmap (product/network) and the [people layer](/en/business/dao/) roadmap (v0.1 → v0.5) evolve in parallel, with no version synchronization.

| Version | Key delivery | Revenue | Risk |
| --- | --- | --- | --- |
| **v0.1** | Internal token-ledger + operational OSS: balances, shares, collateral, basic reputation, statement | Setup + hosting + support + basic compliance | safe |
| **v0.2** | Collective purchasing: collective order, shares, supplier payment, savings generated | Subscription + purchase management fee | safe |
| **v0.3** | Risk and collections: internal limit, score, schedule, blocking, simple provisioning | Risk fee + servicing fee + collections | safe |
| **v0.4** | Scalable InfraCo: multi-tenant, SLA, MCP agents, compliance pack, dashboards | MRR per association | safe |
| **v0.5** | Fiat/USDT settlement **via regulated partner** — never improvise exchange/custody | Settlement fee + reconciliation | caution |
| **v0.6** | Reputation and operational governance: levels, voting, budget | Subscription + modules | safe |
| **v0.7** | Closed structured credit: private pools, suitability/KYC/KYB | Structuring + risk reports | caution |
| **v0.8** | Regulated financial token: receivables, pool, return, eventual secondary market | Structuring + management + servicing | regulated |

## Minimal corporate structure

v0.1 = **a single company: InfraCo Brasil LTDA** (technology and services). No FinanceCo, Foundation, or AuditCo on day 1.

| Corporate purpose — allowed | Corporate purpose — avoid |
| --- | --- |
| Software development, licensing and hosting; support; implementation; consulting; integration; automation; data analysis; training; operational management of collective purchases | Financial intermediation; crypto asset custody; foreign exchange; credit granting; fundraising; portfolio management; securities distribution |

Future entities are born by trigger, not by anticipation:

```text
v0.1  InfraCo LTDA única           — software, hosting, suporte, ledger interno
v0.4  Parceiros externos           — auditoria terceirizada, jurídico
v0.5  FinanceCo ou parceiro regulado — liquidação fiat/USDT, crédito, recebíveis
v0.6  OSS Foundation (opcional)    — governança do OSS, contributors, grants
v0.7  AuditCo / auditor independente — prova de lastro, certificação
v0.8  Veículo regulado de investimento — pools, recebíveis, retorno financeiro
```

## Example: collective purchase

10 associations; order of R$ 100,000; Association A participates with R$ 10,000; 3% fee; negotiated discount of 12%.

| Frontend (Association A) | Ledger (backend) |
| --- | --- |
| Collective order #008 | `CreditIssued: R$ 10.000` |
| Your share: R$ 10,000 | `PurchaseOrderShareIssued: R$ 10.000` |
| Management fee: R$ 300 | `FeeCharged: R$ 300` |
| Estimated savings: R$ 1,200 | `SupplierPaymentReserved: R$ 9.700` |
| Status: awaiting supplier payment | `SavingsRecorded: R$ 1.200` |

The user did not buy an investment. They bought an operational share in a collective purchase.

## Example: reputation

An association pays on time, maintains traceability, has no inventory inconsistencies. Frontend: **Gold Level** → higher purchase limit, lower collateral required, priority in collective orders. Backend: `ReputationUpdated, score: 87, token_type: REPUTATION, transferability: non_transferable`. Reputation cannot be sold — it reduces risk without becoming a financial asset.

## v0.1 backlog — 6 weeks

| Week | Delivery |
| --- | --- |
| 1 | Foundation: InfraCo LTDA, standard contract, ledger terms, "token is not investment" policy, [AGPL](https://www.gnu.org/licenses/agpl-3.0.en.html)/commercial boundaries |
| 2 | Ledger: token types, idempotency, balance projection, statement, hash checkpoint |
| 3 | OSS integration: map core events, outbox, economic positions |
| 4 | Collective purchasing: collective order, `PO_SHARE`, balance reservation, fee, savings |
| 5 | Reputation/governance: non-transferable `REPUTATION`, simple voting, rule-based score |
| 6 | Compliance and pilot: basic KYB, [LGPD](https://www.gov.br/esporte/pt-br/acesso-a-informacao/lgpd)/access, event auditing, pilot with 1–3 associations, first billing |

## Mother phrase

> **From v0.1 on, every economic position in the network is born as an internal token in the backend. But no token is sold as an investment. The user sees balance, shares, collateral, reputation, statement, and operational governance. The infrastructure monetizes software, support, compliance, purchasing, risk, collections, and settlement — while any financial return, receivable, or pool stays locked until a regulated structure exists.**

## Stack

Technical implementation (NATS JetStream + ledger engine + SurrealDB, per ADR-003) in [Token-Ledger (architecture)](/en/architecture/token-ledger/). See also [Infraeconomics](/en/business/tokenomics/) and [DAO & contribution economy](/en/business/dao/).

---

> **Machine-translated v1** — English version generated by LLM, human polish in progress. Report translation errors to gabriel@devmagic.com.br.
