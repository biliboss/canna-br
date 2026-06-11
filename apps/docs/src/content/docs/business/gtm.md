---
title: "Go-to-Market"
description: "FACT first, sandbox timing, dossier template — estratégia de entrada para o mercado de associações de cannabis BR."
---

## Sequência de Entrada

### 1 — FACT First (36 associações via 1 deal)

A FACT (Federação das Associações Cannabis Terapêutica) é o canal de distribuição natural:

- **1 contrato = 36 associações** — elimina o problema de vendas um-a-um
- Relação de confiança prévia — a FACT já vende outros produtos/serviços às associações membro
- **Dor validada:** associações da FACT usam planilhas Excel + WhatsApp para gestão hoje
- Proposta: projeto-piloto com 3–5 associações membro por 90 dias → apresentação para toda a FACT → contrato federação

### 2 — Sandbox Timing (sistema pronto quando edital abrir)

O sandbox ANVISA (RDC 1.014/2026) cria uma janela de timing única:

- **Associações que entram no sandbox PRECISAM de software de compliance** para manter a autorização
- Sistema pronto antes do edital = vantagem de first-mover irreplicável
- SNGPC homologado antes de competidores = moat técnico por 12–18 meses
- Proposta: parceria com 2–3 associações pilotos que entrarão no sandbox para co-desenvolvimento do SNGPC + BSPO

### 3 — Dossier Template (reduz barreira candidatura ANVISA)

A candidatura ao sandbox ANVISA exige documentação técnica complexa. canna-br pode reduzir esse atrito:

- Template de dossier pré-preenchido com campos que o sistema gera automaticamente
- Seção "Controle de Qualidade e Rastreabilidade" auto-documentada via chain of custody
- Seção "Proteção de Dados" auto-documentada via LGPD crypto model
- **Associações que usam canna-br têm vantagem comprovável na candidatura**

### 4 — Base HC Judicial (279 associações fora da FACT)

Além das 36 associações da FACT, há aproximadamente 279 associações que operam via autorização judicial (HC individual ou coletivo). Esse mercado é acessado via:

- SEO: `sistema gestão associação cannabis`, `software SNGPC cannabis`, `planilha dispensação cannabis` → conteúdo educativo
- Comunidade GitHub: self-hosters que contribuem se tornam advogados da marca
- Apresentações em eventos: ExpoCannabis, eventos ABRACANN, meetups regionais
- Indicação: cada associação managed indica 2–3 outras (KPI de NPS desde o mês 3)

---

## Timeline

```
AGORA → JUL/26   Build MVP + homologação SNGPC
──────────────────────────────────────────────
Jan/26  Início desenvolvimento core (membros + cultivo + dispensação)
Mar/26  MVP funcional — 3 associações piloto (self-hosted)
Mai/26  Integração SNGPC + testes com RNDS sandbox
Jun/26  Homologação BSPO + DRE CPC 29
Jul/26  MVP pronto para produção — primeiros paying customers


ABR → JUL/26   Edital sandbox ANVISA
──────────────────────────────────────────────
Abr/26  Edital publicado (previsão regulatória)
Mai/26  Período de candidaturas abertas
Jun/26  Avaliação ANVISA das candidaturas
Jul/26  Publicação dos selecionados para sandbox


AGO/26   Vigência sandbox
──────────────────────────────────────────────
Ago/26  Primeiras associações sandbox iniciam operação regulada
Ago/26  canna-br em produção para associações sandbox — SNGPC obrigatório


SET → OUT/26   Suporte dossier
──────────────────────────────────────────────
Set/26  Dossier template disponível para associações candidatas edital 2027
Out/26  Workshop com FACT: "Como usar canna-br no dossier ANVISA"
Nov/26  Negociação contrato FACT para 2027


MAR/27   Primeiras aprovações
──────────────────────────────────────────────
Mar/27  Primeiras associações recebem autorização definitiva sandbox
Mar/27  Expansão acelerada — demand pull do mercado
2027    Mês 12: R$107k ARR (~20 associações)
2028    Mês 24: R$604k ARR (~80 associações)
```

---

## Riscos e Mitigações

### Risco 1 — Sandbox Atrasa

**Probabilidade:** média (processos regulatórios no Brasil atrasam frequentemente)

**Impacto:** se sandbox não sair em 2026, pipeline de associações reguladas some

**Mitigação:** Base HC judicial não depende do sandbox. 279 associações operam hoje via autorização judicial — esse mercado existe independentemente do sandbox. Priorizar FACT e base HC como mercado primário; sandbox como acelerador, não pré-requisito.

---

### Risco 2 — Schema SNGPC Incompatível

**Probabilidade:** alta (SNGPC tem múltiplas versões e ANVISA pode publicar novo schema para cannabis)

**Impacto:** SNGPC enviado com erro = multa + cancelamento de autorização para a associação

**Mitigação:**
- Contato direto com ANVISA via FALA.BR agora — solicitar schema definitivo para cannabis clubs antes do edital
- Parceria com associação piloto que já tem interlocução com ANVISA
- Engine SNGPC desacoplada (plugin architecture) — update de schema em horas, não semanas

---

### Risco 3 — Concorrente SaaS

**Probabilidade:** alta após sandbox (mercado fica visível)

**Impacto:** price pressure, perda de deals greenfield

**Mitigação:**
- Self-hosted OSS = moat estrutural. Concorrente SaaS não pode replicar auditabilidade.
- First-mover SNGPC + BSPO homologado = custo de migração alto
- FACT deal fecha mercado antes de concorrente entrar
- Comunidade de contribuidores = velocity de features maior que concorrente fechado

---

### Risco 4 — Rollback Político

**Probabilidade:** baixa mas não zero (mudança de governo, pressão conservadora)

**Impacto:** sandbox cancelado, associações forçadas a fechar

**Mitigação:**
- STJ Tema 16 (2024) consolidou direito à cannabis medicinal via HC judicial — não depende de regulamentação executiva
- Base HC judicial é mercado primário; sandbox é secundário
- Sistema é útil para qualquer associação que precisa de controle interno, mesmo sem regulamentação formal
- Código AGPL — mesmo se canna-br fechar, código existe e pode ser mantido por terceiros
