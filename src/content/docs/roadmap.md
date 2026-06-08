---
title: Roadmap
description: Spine-first — Compliance Spine primeiro, cultivo e managed hosting depois. Estrutura de Slice Vertical com Capability+Valor+Done-when.
---

# Roadmap

> **Princípio:** spine-first. O tronco é Member → Prescrição → Quota → Lote → Dispensação → Audit Log → Relatório. Cultivo, processing, laboratório, financeiro completo e managed hosting são galhos — entram quando o tronco está vivo.

Todas as fases dependem das premissas catalogadas em [Premissas Regulatórias](/regulatory-assumptions/). Capability que dependa de premissa *Especulativa* não está aqui — está em Ideas Park.

---

## v0.1 — Domain Blueprint (DONE)

Status: shipado em 2026-06-08. Estado atual da documentação.

| Capability | Valor | Done when |
|---|---|---|
| Domain Model + Event Storming | Vocabulário compartilhado entre engenharia, compliance e advocacia | Docs site com 8 bounded contexts + 38 domain events mapeados |
| Research consolidado | Base de premissas regulatórias auditável | Marco legal, SNGPC, sandbox, mercado, modelos internacionais documentados |
| OSS business model | Tese de viabilidade clara | AGPL-3 + managed hosting + Plausible como proxy validado |

---

## v0.2 — Compliance Spine MVP (now → ago/2026)

Objetivo: provar o core loop em **uma** associação real. Sem cultivo, sem SNGPC real, sem multi-tenant.

| Capability | Valor | Done when |
|---|---|---|
| Member + Prescription | Cadastro mínimo auditável | Membro criado com prescrição válida, CPF hash, consentimento LGPD versionado |
| Monthly Quota | Limite mensal por membro | Quota mensal aplicada por prescrição; dispensação bloqueia se exceder |
| Inventory Lot (manual) | Rastreabilidade de origem do produto dispensado | Lote registrado com ULID, peso, origem (compra/cultivo manual); FIFO por validade |
| Dispensation | Core regulatório | Dispensação → reduz quota → reduz estoque do lote → grava audit log → emite recibo PDF |
| Append-only Audit Log | Trilha imutável | PostgreSQL RULE bloqueia UPDATE/DELETE em `audit_log`; testes confirmam |
| Trace Report PDF | Evidência para a associação | Relatório por membro: prescrições, dispensações, lotes, quotas, datas — exportável |
| Export CSV/JSON | Portabilidade LGPD Art. 18 V | Export de dados de membro em formato estruturado |

**Done when (release):** uma associação piloto registra dispensação real e gera relatório auditável: quem recebeu, quanto, quando, com qual prescrição, de qual lote, dentro da quota, com saldo restante.

---

## v0.3 — Pilot Ready (set/2026 → dez/2026)

Objetivo: 3–5 associações em produção piloto. Endurece o spine.

| Capability | Valor | Done when |
|---|---|---|
| RBAC básico | Segregação de funções (RDC 1.014) | Roles: admin, dispensador, médico, financeiro, DPO. Testes de segregação passando. |
| TOTP para roles críticos | 2FA sem dependência de SaaS auth | `speakeasy` integrado; obrigatório para admin, DPO, financeiro |
| Backup/restore testado | Continuidade operacional | Script `backup.sh` + restore drill documentado em runbook |
| LGPD consent versionado | Conformidade Art. 8 | Versão do consentimento ativo armazenada com timestamp; histórico imutável |
| CPF hash + campos sensíveis cifrados | Conformidade Art. 11 | AES-256-GCM + Member Key derivada por PBKDF2; CPF SHA-256 + site_salt |
| CSV import | Onboarding sem fricção | Membros + prescrições importáveis de planilhas existentes |
| Crypto-deletion | Direito de eliminação Art. 18 IV | Endpoint `/members/:id/crypto-delete` apaga Member Key; testado end-to-end |

---

## v0.4 — Sandbox Dossier Ready (jan/2027 → mai/2027)

Objetivo: associação consegue **candidatar-se ao sandbox** com evidências geradas pelo sistema.

| Capability | Valor | Done when |
|---|---|---|
| Dossier template | Reduz barreira de candidatura | Template Plano de Capacidade Técnico-Operacional pronto, parametrizável por associação |
| KPI dashboard | Indicadores exigidos pela RDC 1.014 | 7 KPIs calculados em tempo real (dispensação, churn de membros, conformidade de quotas, etc.) |
| BSPO draft trimestral | Relatório de balanço auditável | BSPO gerado automaticamente em 15/jan, 15/abr, 15/jul, 15/out |
| RIPD template | Conformidade LGPD Art. 38 | RIPD pré-preenchido com operações de processamento documentadas |
| Evidências exportáveis | Bundle para dossier | ZIP com BSPO + KPIs + RIPD + audit log + relatórios de rastreabilidade |

---

## v0.5 — Regulatory Adapters (jun/2027 → dez/2027)

Objetivo: integração regulatória real. Depende de schema/documentação Anvisa estável (SNCR API prazo: 30/09/2026).

| Capability | Valor | Done when |
|---|---|---|
| Compliance Adapter Layer | Arquitetura plugável | Interface comum para SNGPC, SNCR e futuros sistemas; mocks e prod separados |
| SNGPC adapter (mock → prod) | Movimentação/estoque oficial | XML validado contra XSD; ambiente de homologação Anvisa testado |
| SNCR adapter (se aplicável) | Prescrição eletrônica oficial | API Anvisa integrada quando disponível; fallback para registro manual |
| XML schema versioning | Sobrevive mudança de schema | Versão do schema referenciada em cada submissão; testes de contrato por versão |
| Retry/dead-letter queue | Submissão confiável | BullMQ com retry exponencial; falhas vão para DLQ com alerta |
| Protocol log | Evidência de submissão | Cada submissão Anvisa gera log imutável com payload, response, timestamp |

---

## v1.0 — Full Association ERP (2028)

Objetivo: produto completo. Galhos do tronco já validado.

| Capability | Valor | Done when |
|---|---|---|
| Cultivation | Cultivo rastreável | CultivationBatch → Plant ULID → Harvest. Estado por planta auditado. |
| Processing | Transformação rastreável | ProcessingRun: input lots → output product lot. Massa/perdas registradas. |
| Lab Sample + COA | Qualidade auditável | LabSample com COA (Certificate of Analysis); resultados vinculados ao lote |
| CPC 29 / IAS 41 | Contabilidade de ativo biológico | Fair value de planta calculado por estágio; integração com financeiro |
| Multi-tenant | Hosting SaaS para associação | Schema isolation + RLS; 5+ tenants em staging sem cross-leak |
| Self-serve onboarding | Aquisição escalável | Associação cria conta + configura em < 30min sem intervenção |
| Billing | Receita real | Stripe + NF-e via emissor externo |
| Kamal deploy automatizado | Deploy sem downtime | `kamal deploy` em < 5min para single-tenant; deploy multi-tenant orquestrado |

---

## v2.0 — Scale (2029+)

| Capability | Valor | Done when |
|---|---|---|
| LATAM expansion | CO / MX / AR | Compliance adapter por jurisdição |
| Módulo clínico (SaMD) | Acompanhamento paciente | Avaliação RDC 657 Classe I concluída ou descartada com fundamento |
| B2G analytics | Dashboard ANVISA | Contrato piloto com órgão regulador |
| R$1.87M ARR | Sustentabilidade | 120 associações pagantes |

---

## Ideas Park

Apostas que dependem de premissas *Especulativas* ou exigem validação prévia. Não estão no roadmap até a aposta ser validada com 1 cliente real.

- App mobile PWA para membros (dispensação self-service com assinatura digital)
- IoT integration para cultivo (sensores temperatura/umidade)
- AI compliance alerts (análogo ao "Hanna" da Cannanas DE)
- Federação LATAM: schema adapter por jurisdição
- B2B revenue share com laboratórios homologados
- Marketplace de produtos entre associações (intra-RDC 1.014)
