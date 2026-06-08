---
title: "Premissas Regulatórias"
description: "Mapa de premissas confirmadas, prováveis e especulativas — arquitetura sobrevive premissa errada quando ela está catalogada."
---

# Premissas Regulatórias

Este documento separa **fato** de **aposta**. Cada premissa abaixo carrega o nível de confiança e a fonte primária. Premissa especulativa não deve virar arquitetura sem flag explícita.

Em domínio regulado o que mata não é código ruim — é premissa jurídica errada virando decisão de arquitetura.

---

## Confirmadas (Fonte Primária)

Premissas com texto legal/normativo publicado e vigente.

| Premissa | Fonte | Notas |
|---|---|---|
| RDC 1.014/2026 é instrumento sandbox específico para associações sem fins lucrativos | [Anvisa — publicação 2026](https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2026/anvisa-publica-regras-para-producao-de-cannabis-medicinal) | Não autoriza comercialização. Exige plano de monitoramento, indicadores, controle de qualidade e rastreabilidade. |
| Sandbox vigente em agosto/2026, duração 5 anos | RDC 1.014/2026 | Janela: ago/2026 → ago/2031 |
| LGPD Art. 5 II classifica dados de saúde como sensíveis | Lei 13.709/2018 | Exige base legal explícita do Art. 11 |
| LGPD Art. 18 IV garante direito de eliminação | Lei 13.709/2018 | Crypto-deletion é técnica aceita como cumprimento |
| ANPD Resolução 2/2022 dispensa pequeno porte de nomear encarregado | [ANPD Resolução CD/ANPD 2/2022](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022) | Canal de comunicação com titulares ainda obrigatório |
| SNCR não substitui SNGPC | [Anvisa 2026](https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2026/SNCR-o-que-muda-para-farmacias-e-drogarias-com-o-novo-sistema-de-controle-de-receitas) | SNGPC = movimentação/estoque; SNCR = prescrição. Coexistem. |
| SNCR API com documentação técnica a partir de junho/2026 | [Anvisa 2026-06-03](https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2026/sncr-anvisa-inicia-etapa-de-integracao-com-sistemas-de-prescricao-eletronica-e-amplia-prazo-para-implementacao) | Prazo de implementação ampliado para **30/09/2026**. |
| Associação opera sob HC judicial enquanto não certificada no sandbox | RDC 1.014 + jurisprudência STJ | 315 associações ativas em jun/2026 |
| ANVISA certifica associações, não software | RDC 1.014 + análise interna | Software fornece **evidência operacional** — não é homologado isoladamente |

---

## Prováveis (Inferência Forte, Não Confirmada)

Premissas baseadas em análise de texto regulatório + jurisprudência + comparáveis internacionais. Arquitetura pode incorporar, mas com flag.

| Premissa | Confiança | Como verificar |
|---|---|---|
| Encarregado/DPO recomendado para associação de cannabis mesmo em pequeno porte | Alta | Consulta com advogado especializado em LGPD saúde |
| Dossier do sandbox vai exigir Plano de Capacidade Técnico-Operacional documentado | Alta | Aguardar edital de seleção (esperado Q3/2026) |
| Sandbox terá processo seletivo por edital, não inscrição contínua | Alta | Aguardar publicação Anvisa |
| BSPO trimestral é o template que a Anvisa vai exigir no sandbox | Média | Cross-check com IN/RDC complementares pós-1.014 |
| Self-hosted reduz superfície de risco LGPD para a diretoria da associação | Alta | Sem fornecedor SaaS → sem transferência internacional, sem suboperador, sem lock-in de dados |
| RDC 657 (SaMD) não se aplica a sistema de gestão administrativa | Alta | Texto da RDC 657 exclui software puramente administrativo. Confirmar com consulta formal Anvisa se necessário. |
| FACT (Federação) negocia 1 contrato → 36 instalações | Média | Conversar com diretoria FACT diretamente |

---

## Especulativas (Apostas de Produto)

Hipóteses comerciais e de adoção. **Devem ser flag de produto, não premissa de arquitetura**.

| Aposta | Risco se errada | Plano B |
|---|---|---|
| Associações pagam R$450–R$780/mês em managed hosting | ARR projection cai 60–80% | Pivotar para services-light (consultoria de implementação) ou foco em poucos enterprise (FACT, top-20 associações) |
| 38% das 315 associações migram para canna-oss em 3 anos | SOM 2030 cai para R$5–10M | Reduzir time, otimizar para nicho high-touch |
| Mercado expande de 315 → 800 associações até 2030 | Pool de adoção menor | Foco em retenção e upsell vs aquisição |
| AGPL não afasta associações (advogado da associação aprova) | Bloqueio de venda em 30%+ dos casos | Dual licensing — oferecer licença comercial para casos restritos |
| OSS audit é argumento de venda decisivo vs Cannanas/XURU | Trust moat fraco na prática | Compete em features (compliance engine, integração SNGPC) |
| ANVISA não exigirá homologação formal de software no edital | Reescrever roadmap inteiro com camada de certificação | Compliance Adapter Layer já está pronta para receber regra de homologação como capability |
| SNGPC schema permanece estável durante a fase de homologação | Refactor do adapter | Versionar adapter por release Anvisa, manter tests de contrato |

---

## Como Usar Este Documento

**Antes de adicionar uma feature ao roadmap**, verifique de qual coluna ela depende:

- Depende só de **Confirmadas** → pode entrar como capability normal
- Depende de **Prováveis** → entra com flag `[ASSUMPTION]` no done-when e plano de verificação
- Depende de **Especulativas** → não é roadmap, é experimento. Vai para Ideas Park até a aposta ser validada com 1 cliente real.

**Trimestralmente**: revisar a coluna *Prováveis* — algum item migrou para *Confirmadas* (regulação publicou) ou para *Especulativas* (regulação contradisse)?
