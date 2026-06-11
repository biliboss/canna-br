---
title: "DAO & Economia de Contribuição"
description: "Governança sociocrática + Contribution Ledger (CONTRIB = US$ 1 referência contábil). Trabalho tokenizado desde o dia 1, sem promessa de investimento."
---

> O projeto é um **projeto-DAO com camada operacional/comercial** — não uma empresa que tem comunidade. Existem **duas economias**: a do produto/rede (associações, hosting, compliance, ledger econômico) e a da **construção do projeto** (contribuidores, papéis, círculos, governança). Trabalho e contribuição viram **posições tokenizadas desde o dia 1** — sem nunca virar promessa pública de investimento.

O que isso resolve: justiça entre early contributors, memória econômica do esforço, governança clara e base transparente para compensação futura. O que isso não é: promessa de enriquecimento, token especulativo, governança plutocrática, voluntariado invisível ou caos informal.

## Princípios Constitucionais

Constituição Operacional curta, pública e versionada:

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

> **O token é memória contábil do esforço; a governança é sociocrática; a remuneração futura é consequência de caixa real, não de narrativa.**

## Estrutura Sociocrática

Círculo-raiz (Stewardship) guarda propósito, princípios, alocação macro e criação/extinção de círculos. Seis círculos iniciais, com papéis explícitos mesmo com pouca gente — 1 pessoa pode ocupar 3-4 papéis; o que importa é **clareza de chapéus**:

```text
General/Stewardship
├── Product & OSS Core ......... Core Maintainer, Release Steward, MCP Architect
├── Economic Infra ............. Ledger Steward, Risk Steward, Pricing Steward
├── Community & Growth ......... Onboarding Steward, Community Facilitator, Partnership Steward
├── Compliance & Trust ......... Privacy Steward, Audit Trail Steward, Policy Steward
└── Treasury & Operations ...... Treasury Steward, Compensation Steward, Vendor Steward
```

Double-linking: cada círculo tem **Lead Link** (leva prioridades do círculo-pai ao filho) e **Rep Link** (leva tensões do filho ao pai). Evita centralização.

São papéis, não cargos. Cada papel declara nome, propósito, domínio, accountabilities, círculo, holder atual e mandato de revisão. Autoridade vem do papel e do domínio — nunca de cargo informal.

## Fluxo Tensão → Ação

```text
Tensão percebida → registro → triage no círculo →
  operacional? → resolve no papel existente
  governança?  → proposta → esclarecimento → reação → consentimento
    objeção válida? → integra → repete consentimento
    sem objeção    → adota → atualiza papéis/políticas → executa → revisão
```

A pergunta nunca é "todo mundo concorda?". É: **"existe objeção fundamentada que mostre dano ou regressão?"** Acelera muito.

## Contribution Ledger

Toda contribuição relevante vira registro público auditável: quem, círculo/papel, entrega, evidência, valor de referência, revisor, status.

**`CONTRIB` = 1 unidade = US$ 1 de referência contábil.**

CONTRIB é unidade de **medida de esforço reconhecido** — como hora ou story point. A referência em USD existe só para comparabilidade contábil. Conversão em pagamento é **discricionária**: depende de caixa real e política vigente — nunca automática, nunca passivo exigível, nunca stablecoin.

| Significa | NÃO significa |
|---|---|
| Memória econômica auditável | Direito líquido e certo de saque imediato |
| Base para compensação futura quando houver caixa | Rendimento ou yield |
| Alinhamento entre early contributors | Valor mobiliário automático |
| Transparência sobre quem construiu o quê | Promessa pública de retorno |

Fórmula:

```text
Valor (USD ref) = Base Rate da função × Tempo ou Escopo
                  × Mult. qualidade × Mult. prioridade × Mult. risco
```

Exemplo: Product Architect, US$ 100/h × 20h × 1,0 × 1,0 × 1,0 = **US$ 2.000 → 2.000 CONTRIB**.

Dois modos, ambos usados: **horas** para papéis contínuos/leadership; **bounties** por escopo para entregas pontuais (ex.: issue US$ 300, feature US$ 1.000, compliance policy draft US$ 500).

## Tokens da Camada de Pessoas

| Token | Função | Transferível? | Visível? |
|---|---|---|---|
| `CONTRIB` | registro de contribuição com referência USD | não | sim |
| `ROLE_BADGE` | marca posse de papel | não | sim |
| `REPUTATION` | reputação histórica e confiabilidade | não | sim |
| `GOV_RIGHT` | direito de participar de certos processos | restrito | sim |
| `COMP_CLAIM` | posição de compensação futura (opcional) | não/restrito | interno |

v0.1 usa os quatro primeiros. CONTRIB resolve 80% do problema sozinho.

## Processo de Mint

Nunca auto-mint irrestrito:

```text
Contributor registra entrega + evidência → Reviewer revisa escopo/qualidade
→ propõe valor USD ref → círculo valida por consentimento leve
→ mint CONTRIB → publica no dashboard auditável
```

Regras anti-abuso:

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

## Transparência Radical

O dashboard público é a peça cultural mais importante. Mostra pessoas e papéis (quem, qual papel, círculo, desde quando), governança (tensões abertas, propostas, objeções integradas, decisões), contribuições (quem, quanto reconhecido em USD ref, evidência, revisor) e economia interna (total CONTRIB emitido, distribuição por círculo e pessoa, caixa real, compensações pagas e pendentes). Quem quiser auditar, audita — sem pedir permissão.

## Ciclo de Vida do Contribuidor

```text
Observador → Contribuidor ocasional → Contribuidor reconhecido
→ Role holder → Circle member → Steward / Lead / Rep
```

Avanço por contribuição demonstrada com evidência, comportamento alinhado, confiabilidade e capacidade de assumir accountabilities — não por antiguidade nem proximidade.

Disputas têm 3 trilhas: **contribuição** ("fui subavaliado" → revisor → círculo → compensation steward), **papel/domínio** ("quem decide isso?" → governança do círculo → general circle) e **relacional** (trust steward → processo restaurativo).

## Anti-Plutocracia

> **NÃO fazer "1 token = 1 voto" como regra principal.** Cedo demais, isso vira plutocracia contábil.

Governança vem de 3 fontes: **papel atual** (autoridade operacional no domínio), **círculo** (decisões por consentimento) e **contribution ledger** (reputação, legitimidade, histórico).

Token pesa em: elegibilidade para papéis, prioridade em retrocompensação, legitimacy score, peso auxiliar em decisões orçamentárias. Evitar: comprar poder político, governança puramente financeira, whales internos, voto irrestrito por acumulação histórica.

## Tipos de Decisão

```text
A. Operacionais    → papel responsável (ferramenta, bug, aprovar PR no domínio)
B. Táticas         → círculo (prioridades do mês, backlog, divisão de papéis)
C. Governança      → consentimento formal (papel, política, rate card, regra de mint)
D. Constitucionais → processo mais forte (princípios, compensação, relação InfraCo↔DAO)
```

## Remuneração

Três etapas, conforme caixa real:

| Etapa | Estado | O que acontece |
|---|---|---|
| 1 | Sem caixa | Registro público; pequenas despesas reembolsadas; nenhuma promessa automática |
| 2 | Caixa inicial | Compensação ativa para papéis críticos + retrocompensação parcial via ledger |
| 3 | Caixa saudável | Salário/retainer papéis-chave + retrocompensação recorrente + bounty/contributor pool |

Waterfall de pessoas — nada pula etapa:

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

Retrocompensação proporcional ao CONTRIB acumulado elegível. Exemplo: pool de US$ 10.000; total elegível 50.000 CONTRIB; quem tem 8.000 CONTRIB recebe 16% → **US$ 1.600**.

## Linguagem Segura

Sempre **"valor de referência contábil em USD"** — nunca "token vale dólar" nem "conversível automaticamente". A [CVM](https://www.gov.br/cvm/pt-br/acesso-a-informacao-cvm/perguntas-frequentes-da-cvm/criptoativos-quando-se-aplicam-as) olha a substância econômica do ativo, não o nome — e a substância do CONTRIB é registro de esforço, não promessa de retorno.

```text
- o projeto reconhece contribuição em unidades internas
- cada unidade = US$ 1 de referência contábil
- a referência serve para memória econômica, comparação e eventual compensação futura
- o registro não implica resgate imediato nem garantido
- compensação depende de política vigente e caixa real
```

## DAO vs Wrapper Legal

> **Socialmente e operacionalmente, o projeto é uma DAO. Juridicamente, uma LTDA executa**: assina, paga, recebe, contabiliza e aplica retrocompensação conforme a política que a DAO decidiu.

## Tecnologias de Referência

| Tecnologia | O que é | Uso aqui |
|---|---|---|
| [Hats Protocol](https://www.hatsprotocol.xyz/) | Papéis/credenciais como tokens ERC-1155 em árvore; cada "hat" concede permissões revogáveis pelo papel-pai | Mapeia quase literalmente círculos aninhados + double-linking. v0.1 **espelha a lógica off-chain**, como dados no próprio sistema |
| [Safe](https://safe.global/) | Multisig battle-tested, padrão de mercado para tesouraria DAO | Tesouraria futura on-chain, quando existir |
| Coordinape / SourceCred | Mecânica de allocation circles para reconhecimento de contribuição | **Inspiração de mecânica apenas** — Coordinape foi descontinuado (2021–2025); não construir em cima |

Migração on-chain (Hats + Safe) só quando fizer sentido. A camada de abstração do [Token-Ledger](/architecture/token-ledger/) (NATS JetStream + ledger engine + SurrealDB, ADR-003) permite trocar ledger interno por blockchain sem mudar a experiência.

## Roadmap da Camada de Pessoas

Trilhas independentes — o roadmap do [produto](/business/token-ledger/) (v0.1 → v0.8) e o da camada de pessoas (v0.1 → v0.5) evoluem em paralelo, sem sincronização de versões.

Sem corrida para v1.0: só minors — cada minor entrega valor real e compõe sobre o anterior.

| Versão | Entrega |
|---|---|
| v0.1 | Constituição + círculos iniciais + papéis + rate card público + tensões + mint CONTRIB + dashboard básico |
| v0.2 | Governança formal: consentimento, eleições, double-linking, política de objeção |
| v0.3 | REPUTATION, elegibilidade, rotação de papéis, score de confiabilidade |
| v0.4 | Compensação com caixa: compensation pool, retrocompensação, retainer, budget por círculo |
| v0.5 | Integração total: círculos gerem budgets reais; dashboard unificado produto+governança+tesouraria |

## Recomendação Central

> **O token da camada de pessoas é um ledger moral-econômico de contribuição, não um ativo especulativo. A governança é role-based, circle-based e consent-based — o token entra como memória e legitimidade, nunca como tirania numérica.**

## Relacionado

- [Tokenomics](/business/tokenomics/) — economia do produto/rede
- [Token-Ledger v0.1](/business/token-ledger/) — posições econômicas internas sem promessa de retorno
- [Token-Ledger (arquitetura)](/architecture/token-ledger/) — NATS JetStream + ledger engine + SurrealDB
