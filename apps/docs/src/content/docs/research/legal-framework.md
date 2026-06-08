---
title: "Marco Legal Brasil"
description: "Lei 11.343, STF Tema 506, STJ Tema 16 IAC, RDC 1.014/2026 — evolução regulatória do cannabis associativo no Brasil."
---

## Evolução Regulatória

| Marco | Ano | Efeito |
|---|---|---|
| **Lei 11.343/2006** | 2006 | Proibição geral — tráfico e uso indiscriminado na mesma lei; sem diferenciação para fins medicinais/associativos |
| **STF Tema 506** | 2015+ | Descriminalização pessoal do porte para uso próprio — não resolve associações coletivas; foca no indivíduo |
| **STJ Tema 16 IAC** | 2023 | Salvo-conduto coletivo via HC — protege a associação inteira, não apenas o indivíduo; habilita operação sob supervisão judicial |
| **RDC 1.014/2026** | 2026 | Sandbox ANVISA — legitimidade administrativa para associações de pacientes; vigência 4 agosto 2026 |

---

## Situação Atual

- **315 associações** operam sob Habeas Corpus judicial (HC coletivo derivado do Tema 16 IAC).
- Compliance é **informal**: cada associação negocia seu HC com o judiciário local.
- **Risco para diretores**: responsabilidade penal individual persiste enquanto não há legitimidade administrativa formal.
- A RDC 1.014/2026 muda o paradigma: operação **legitimada** via sandbox regulatório, com **fiscalização ANVISA direta**.

---

## Mudança com o Sandbox RDC 1.014

- Associações aprovadas no sandbox operam sob **autorização administrativa**, não apenas judicial.
- ANVISA passa a ser a autoridade fiscalizadora primária.
- Compliance documentado (planos obrigatórios, KPIs, rastreabilidade) substitui o regime de "tolerância judicial".
- Associações fora do sandbox continuam no regime atual (HC + risco penal).

---

## Proibições Absolutas — RDC 1.014

| Proibição | Detalhe |
|---|---|
| Comercialização vedada | Nenhuma transação financeira pela cannabis em si; apenas custeio de membros |
| Só dispensação para membros | Estritamente restrito ao quadro associativo cadastrado |
| Sem fins lucrativos | Toda receita reverte para operação/pesquisa; proibida distribuição de lucro |
| Publicidade proibida | Sem divulgação comercial de produtos ou serviços derivados |

---

## Implicações para Software

A regulação impõe exigências técnicas diretas ao sistema de gestão:

- **Audit trail obrigatório**: toda dispensação, transferência e evento de produto deve ser registrado e imutável.
- **SNGPC**: integração com o Sistema Nacional de Gerenciamento de Produtos Controlados — envio periódico de dispensações de substâncias controladas.
- **RBAC com segregação de funções**: separação entre papéis (diretor, responsável técnico, cultivador, dispensador) com log de quem fez o quê.
- **Rastreabilidade seed-to-dispensação**: planta matriz → clone → cultivo → colheita → processamento → estoque → dispensação.
- **LGPD aplicada a dados sensíveis**: dados de saúde dos membros (condição, receita, dosagem) exigem consentimento explícito e controle de acesso restrito.
