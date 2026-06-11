---
title: Setor Público & Government-Ready
description: canna-br como infraestrutura de interesse público — dados confiáveis, auditáveis e interoperáveis para rastreabilidade, evidência regulatória e governança de associações.
---

# Setor Público & Government-Ready

> **canna-br é infraestrutura de interesse público.**
> Dados confiáveis, auditáveis e interoperáveis para um setor que precisa provar qualidade e segurança.
> Base neutra para associações, pesquisadores, reguladores, farmacovigilância, compliance e parceiros em contextos legalmente permitidos.
> Nenhuma captura setorial. Nenhum lobby. Apenas evidência.

---

## Alinhamento Regulatório

### RDC 1.014/2026 — Sandbox Regulatório Anvisa

A RDC 1.014/2026 cria o programa de sandbox regulatório para produtos e serviços inovadores em saúde. Para participar, organizações devem demonstrar:

| Exigência sandbox | Como o canna-br atende |
|---|---|
| Monitoramento contínuo de desfechos | Audit log imutável + KPI dashboard operacional |
| Evidências de segurança e qualidade | Módulo de evidência regulatória com coortes anonimizadas |
| Relatórios técnico-regulatórios periódicos | BSPO trimestral gerado via agente; revisão RT via MCP App |
| Supervisão e transparência | Observabilidade pública com indicadores agregados |
| Plano de Capacidade Técnico-Operacional | Templates de dossier gerados por agente (v0.4) |

Referência oficial: [Programa Sandbox Regulatório — gov.br](https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2026/anvisa-lanca-programa-sandbox-regulatorio)

### RNDS — Rede Nacional de Dados em Saúde

A RNDS é a plataforma oficial de interoperabilidade em saúde do Ministério da Saúde (LGPD-compliant). O canna-br projeta exportação e APIs compatíveis com os padrões RNDS para viabilizar integração futura com o ecossistema público de saúde.

Referência oficial: [RNDS — Rede Nacional de Dados em Saúde](https://www.gov.br/saude/pt-br/composicao/sctie/daf/rnds)

---

## Funcionalidades Government-Ready

| Módulo | O que entrega | Fase |
|---|---|---|
| **Rastreabilidade ponta-a-ponta** | Trilha imutável de cada dispensação: lote → membro → RT aprovador → timestamp. Audit log com RULE PostgreSQL bloqueando UPDATE/DELETE. | v0.1.0 |
| **Evidência regulatória** | Desfechos clínicos opcionais, eventos adversos, protocolos de uso, coorte anonimizada exportável. Base para dossier sandbox e farmacovigilância. | v0.3 – v0.4 |
| **Interoperabilidade RNDS** | Export padronizado (CSV/JSON LGPD Art. 18 V), APIs abertas, trilhas compatíveis com padrões RNDS. Adaptador plugável (mock → produção). | v0.4 – v0.5 |
| **Governança associativa** | Prestação de contas auditável, assembleias registradas como eventos de domínio, papéis com escopo RBAC, consentimento versionado. | v0.1.0 – v0.3 |
| **Observabilidade pública** | KPI dashboard com indicadores agregados (dispensações, conformidade de quotas, churn, pendências compliance). Leitura pública sem credenciais. | v0.3 |
| **Sandbox-ready compliance** | Templates BSPO + RIPD + Dossier gerados via agente; revisão humana obrigatória antes de submissão; protocolo experimental documentado; limites e monitoramento configuráveis. | v0.4 |

---

## Conselho Consultivo

O canna-br constitui um conselho consultivo externo com foco em **regulação, qualidade e saúde pública** — não em relações comerciais com o setor.

### Estrutura de Cadeiras

| Cadeira | Foco |
|---|---|
| 1 — Regulação sanitária | Análise institucional; alinhamento com marcos regulatórios vigentes e futuros |
| 2 — Saúde pública e farmacovigilância | Protocolos de desfechos, eventos adversos, evidências clínicas |
| 3 — LGPD, ética e governança de dados | Privacidade, proteção de dados, compliance e ética em dados sensíveis de saúde |
| 4 — Relações governamentais e interoperabilidade SUS | Coordenação público-privada, integração RNDS, diálogo institucional |
| *(em formação)* Infraestrutura financeira e token-ledger | Tokenomics, BaaS, mecanismos de coordenação econômica em redes de saúde |

### Critérios de Participação

- **Somente ex-dirigentes e ex-especialistas.** Nenhum ocupante atual de cargo público é abordado — critério ético inegociável para evitar conflito de interesse e percepção de captura regulatória.
- **Framing correto:** "conselho consultivo de regulação, qualidade e saúde pública" — não "alguém da agência para destravar aprovações".
- **Mandato revisado anualmente.** Independência garantida por regimento interno.
- **Pitch:** *"Venha construir infraestrutura confiável para evidência, compliance e coordenação público-privada."*

---

## O que o canna-br Não É

| Não é | É |
|---|---|
| Lobby setorial | Infraestrutura neutra, OSS, auditável por qualquer parte |
| Software anti-indústria | Base aberta para associações, pesquisadores e reguladores |
| Captura regulatória | Conselho consultivo independente, somente ex-dirigentes |
| Promessa de aprovação regulatória | Ferramenta para construir o dossier de evidências que a Anvisa exige |
| Plataforma fechada de um player | AGPL-3 — código público, governança documentada, audit log imutável |

O posicionamento correto é: **infraestrutura de interesse público para rastreabilidade, evidência, interoperabilidade e governança de associações** — compatível com reguladores, pesquisadores, setor privado e setor público, sem favorecer nenhum grupo específico.

---

## Veja Também

- [Infraeconomics (Tokenomics)](/business/tokenomics/)
- [Chain of Custody](/architecture/chain-of-custody/)
- [ANVISA Sandbox Research](/research/anvisa-sandbox/)
- [Roadmap](/roadmap/)
