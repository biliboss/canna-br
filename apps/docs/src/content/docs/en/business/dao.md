---
title: "DAO & Contribution Economy"
description: "Sociocratic governance + Contribution Ledger (CONTRIB = US$ 1 accounting reference). Work tokenized from day 1, with no investment promise."
---

> The project is a **DAO-project with an operational/commercial layer** — not a company that has a community. There are **two economies**: that of the product/network (associations, hosting, compliance, economic ledger) and that of **building the project** (contributors, roles, circles, governance). Work and contribution become **tokenized positions from day 1** — without ever becoming a public investment promise.

What this solves: fairness among early contributors, economic memory of effort, clear governance, and a transparent basis for future compensation. What this is not: a promise of getting rich, a speculative token, plutocratic governance, invisible volunteering, or informal chaos.

## Constitutional Principles

A short, public, versioned Operational Constitution:

```text
1.  Transparência radical por padrão
2.  Tensão gera evolução
3.  Consentimento > consenso
4.  Autoridade vem de papel e domínio, não de cargo informal
5.  Círculos governam domínios claros
6.  Double-linking entre círculos
7.  Contribuição registrada publicamente
8.  Token registra esforço, não promete liquidez imediata
9.  Caixa real remunera pessoas reais
10. O core é open source; o valor vem da execução
11. Quem assume responsabilidade deve ter autonomia compatível
12. Todo poder deve deixar trilha auditável
```

> **The token is accounting memory of effort; governance is sociocratic; future compensation is a consequence of real cash, not narrative.**

## Sociocratic Structure

The root circle (Stewardship) holds purpose, principles, macro allocation, and the creation/dissolution of circles. Six initial circles, with explicit roles even with few people — 1 person may hold 3-4 roles; what matters is **clarity of hats**:

```text
General/Stewardship
├── Product & OSS Core ......... Core Maintainer, Release Steward, MCP Architect
├── Economic Infra ............. Ledger Steward, Risk Steward, Pricing Steward
├── Community & Growth ......... Onboarding Steward, Community Facilitator, Partnership Steward
├── Compliance & Trust ......... Privacy Steward, Audit Trail Steward, Policy Steward
└── Treasury & Operations ...... Treasury Steward, Compensation Steward, Vendor Steward
```

Double-linking: each circle has a **Lead Link** (carries the parent circle's priorities down to the child) and a **Rep Link** (carries the child's tensions up to the parent). Prevents centralization.

These are roles, not job titles. Each role declares a name, purpose, domain, accountabilities, circle, current holder, and review mandate. Authority comes from the role and the domain — never from an informal title.

## Tension → Action Flow

```text
Tensão percebida → registro → triage no círculo →
  operacional? → resolve no papel existente
  governança?  → proposta → esclarecimento → reação → consentimento
    objeção válida? → integra → repete consentimento
    sem objeção    → adota → atualiza papéis/políticas → executa → revisão
```

The question is never "does everyone agree?". It is: **"is there a reasoned objection showing harm or regression?"** It speeds things up dramatically.

## Contribution Ledger

Every relevant contribution becomes a public, auditable record: who, circle/role, deliverable, evidence, reference value, reviewer, status.

**`CONTRIB` = 1 unit = US$ 1 of accounting reference.**

CONTRIB is a unit of **recognized effort** — like an hour or a story point. The USD reference exists only for accounting comparability. Conversion into payment is **discretionary**: it depends on real cash and current policy — never automatic, never an enforceable liability, never a stablecoin.

| Means | Does NOT mean |
|---|---|
| Auditable economic memory | A clear-cut right to immediate withdrawal |
| Basis for future compensation when cash exists | Income or yield |
| Alignment among early contributors | An automatic security |
| Transparency about who built what | A public promise of return |

Formula:

```text
Valor (USD ref) = Base Rate da função × Tempo ou Escopo
                  × Mult. qualidade × Mult. prioridade × Mult. risco
```

Example: Product Architect, US$ 100/h × 20h × 1.0 × 1.0 × 1.0 = **US$ 2,000 → 2,000 CONTRIB**.

Two modes, both used: **hours** for ongoing/leadership roles; **bounties** by scope for one-off deliverables (e.g.: issue US$ 300, feature US$ 1,000, compliance policy draft US$ 500).

## People-Layer Tokens

| Token | Function | Transferable? | Visible? |
|---|---|---|---|
| `CONTRIB` | contribution record with USD reference | no | yes |
| `ROLE_BADGE` | marks role tenure | no | yes |
| `REPUTATION` | historical reputation and reliability | no | yes |
| `GOV_RIGHT` | right to participate in certain processes | restricted | yes |
| `COMP_CLAIM` | future compensation position (optional) | no/restricted | internal |

v0.1 uses the first four. CONTRIB solves 80% of the problem on its own.

## Mint Process

Never unrestricted self-minting:

```text
Contributor registra entrega + evidência → Reviewer revisa escopo/qualidade
→ propõe valor USD ref → círculo valida por consentimento leve
→ mint CONTRIB → publica no dashboard auditável
```

Anti-abuse rules:

```text
1.  ninguém aprova sozinho a própria contribuição acima de threshold
2.  toda contribuição precisa de evidência
3.  vínculo obrigatório com tensão, tarefa, bounty ou papel
4.  rate card público
5.  mudanças no rate card exigem governança
6.  disputa aberta por janela curta
7.  auditoria periódica do ledger
8.  contribuições fundadoras separadas das operacionais
9.  governança não é só token-weighted
10. contribuição passada não substitui responsabilidade presente
```

## Radical Transparency

The public dashboard is the most important cultural piece. It shows people and roles (who, which role, circle, since when), governance (open tensions, proposals, integrated objections, decisions), contributions (who, how much recognized in USD ref, evidence, reviewer), and the internal economy (total CONTRIB issued, distribution by circle and person, real cash, compensations paid and pending). Anyone who wants to audit, audits — without asking permission.

## Contributor Lifecycle

```text
Observador → Contribuidor ocasional → Contribuidor reconhecido
→ Role holder → Circle member → Steward / Lead / Rep
```

Advancement comes from demonstrated contribution with evidence, aligned behavior, reliability, and the capacity to take on accountabilities — not from seniority or proximity.

Disputes have 3 tracks: **contribution** ("I was undervalued" → reviewer → circle → compensation steward), **role/domain** ("who decides this?" → circle governance → general circle), and **relational** (trust steward → restorative process).

## Anti-Plutocracy

> **Do NOT make "1 token = 1 vote" the primary rule.** Too early, that becomes accounting plutocracy.

Governance comes from 3 sources: **current role** (operational authority over the domain), **circle** (decisions by consent), and **contribution ledger** (reputation, legitimacy, track record).

The token weighs in: eligibility for roles, priority in retro-compensation, legitimacy score, auxiliary weight in budget decisions. To avoid: buying political power, purely financial governance, internal whales, unrestricted voting through historical accumulation.

## Decision Types

```text
A. Operacionais    → papel responsável (ferramenta, bug, aprovar PR no domínio)
B. Táticas         → círculo (prioridades do mês, backlog, divisão de papéis)
C. Governança      → consentimento formal (papel, política, rate card, regra de mint)
D. Constitucionais → processo mais forte (princípios, compensação, relação InfraCo↔DAO)
```

## Compensation

Three stages, according to real cash:

| Stage | State | What happens |
|---|---|---|
| 1 | No cash | Public record; small expenses reimbursed; no automatic promise |
| 2 | Initial cash | Active compensation for critical roles + partial retro-compensation via ledger |
| 3 | Healthy cash | Salary/retainer for key roles + recurring retro-compensation + bounty/contributor pool |

People waterfall — nothing skips a stage:

```text
Receita real → Caixa →
1. Custos operacionais mínimos
2. Infra / cloud / ferramentas
3. Compliance / jurídico / contábil
4. Reserva prudencial
5. Compensação ativa de papéis críticos
6. Retrocompensação de contribuições históricas
7. Bounty / contributor pool
8. Crescimento / reinvestimento
9. Token treasury / mecanismos futuros
```

Retro-compensation proportional to eligible accumulated CONTRIB. Example: pool of US$ 10,000; total eligible 50,000 CONTRIB; whoever holds 8,000 CONTRIB receives 16% → **US$ 1,600**.

## Safe Language

Always **"USD accounting reference value"** — never "the token is worth a dollar" nor "automatically convertible". The [CVM](https://www.gov.br/cvm/pt-br/acesso-a-informacao-cvm/perguntas-frequentes-da-cvm/criptoativos-quando-se-aplicam-as) (Brazilian securities regulator) looks at the economic substance of the asset, not its name — and CONTRIB's substance is a record of effort, not a promise of return.

```text
- o projeto reconhece contribuição em unidades internas
- cada unidade = US$ 1 de referência contábil
- a referência serve para memória econômica, comparação e eventual compensação futura
- o registro não implica resgate imediato nem garantido
- compensação depende de política vigente e caixa real
```

## DAO vs Legal Wrapper

> **Socially and operationally, the project is a DAO. Legally, an LTDA (Brazilian limited liability company) executes**: it signs, pays, receives, keeps the books, and applies retro-compensation according to the policy the DAO decided.

## Reference Technologies

| Technology | What it is | Use here |
|---|---|---|
| [Hats Protocol](https://www.hatsprotocol.xyz/) | Roles/credentials as ERC-1155 tokens in a tree; each "hat" grants permissions revocable by the parent role | Maps almost literally to nested circles + double-linking. v0.1 **mirrors the logic off-chain**, as data inside the system itself |
| [Safe](https://safe.global/) | Battle-tested multisig, the market standard for DAO treasuries | Future on-chain treasury, when it exists |
| Coordinape / SourceCred | Allocation-circle mechanics for contribution recognition | **Mechanics inspiration only** — Coordinape was discontinued (2021–2025); do not build on top of it |

On-chain migration (Hats + Safe) only when it makes sense. The [Token-Ledger](/en/architecture/token-ledger/) abstraction layer (NATS JetStream + ledger engine + SurrealDB, ADR-003) allows swapping the internal ledger for a blockchain without changing the experience.

## People-Layer Roadmap

Independent tracks — the [product roadmap](/en/business/token-ledger/) (v0.1 → v0.8) and the people-layer roadmap (v0.1 → v0.5) evolve in parallel, with no version synchronization.

No race to v1.0: minors only — each minor ships real value and compounds on the previous one.

| Version | Deliverable |
|---|---|
| v0.1 | Constitution + initial circles + roles + public rate card + tensions + CONTRIB mint + basic dashboard |
| v0.2 | Formal governance: consent, elections, double-linking, objection policy |
| v0.3 | REPUTATION, eligibility, role rotation, reliability score |
| v0.4 | Compensation with cash: compensation pool, retro-compensation, retainer, per-circle budget |
| v0.5 | Full integration: circles manage real budgets; unified product+governance+treasury dashboard |

## Core Recommendation

> **The people-layer token is a moral-economic ledger of contribution, not a speculative asset. Governance is role-based, circle-based, and consent-based — the token comes in as memory and legitimacy, never as numerical tyranny.**

## Related

- [Tokenomics](/en/business/tokenomics/) — product/network economy
- [Token-Ledger v0.1](/en/business/token-ledger/) — internal economic positions with no promise of return
- [Token-Ledger (architecture)](/en/architecture/token-ledger/) — NATS JetStream + ledger engine + SurrealDB

---

> **Machine-translated v1** — English version generated by LLM, human polish in progress. Report translation errors to gabriel@devmagic.com.br.
