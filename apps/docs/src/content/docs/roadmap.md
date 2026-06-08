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

## v0.2 — Domain Kernel + Compliance Spine MVP (now → ago/2026)

Objetivo: provar o core loop em **uma** associação real. **Ordem fixa**: domínio puro primeiro, banco/HTTP depois. Sem cultivo, sem SNGPC real, sem multi-tenant. Ver [Domain Kernel](/architecture/domain-kernel/).

### v0.2.0 — Domain Kernel Spike (primeiro)

| Capability | Valor | Done when |
|---|---|---|
| `packages/domain` TS puro | Feedback rápido para Claude Code | `pnpm verify` em < 5s; vitest GIVEN/WHEN/THEN |
| Membership decider | Estado de membro auditável | 8 eventos + scenario coverage 100% (success + rejection + transitions) |
| Inventory decider | Estado de lote auditável | 5 eventos + scenario coverage 100% |
| Dispensation use case | Core regulatório em código puro | Cross-aggregate use case; emite Recorded / Rejected / QuotaExceededAttempt |
| Emmett in-memory event store | Validar Event Sourcing kernel | Comandos gravam stream; optimistic concurrency testado |
| Spike Emmett Postgres | Critério de adoção | Core loop end-to-end funciona; se passa, Emmett vira oficial |

### v0.2.1 — Compliance Spine HTTP + Minimum Admin

Objetivo: tirar dispensação do terminal para o navegador. **UI deliberadamente mínima** — só o que dispensador e RT precisam para operar. Diretoria dashboard espera v0.3.

| Capability | Valor | Done when |
|---|---|---|
| Fastify endpoints finos | Expor commands via HTTP | POST /commands/register-member, /validate-prescription, /release-lot, /record-dispensation |
| Drizzle read models | Queries sem hit no event store | Projections: member-list, dispensation-history, inventory-summary, member-quota, inventory-lot |
| Append-only audit log | Trilha imutável | PostgreSQL RULE bloqueia UPDATE/DELETE em `audit_log` |
| Login / TOTP / RBAC mínimo | Auth funcional | JWT + speakeasy; roles DISPENSADOR + RT + DPO básicos |
| **Dispensador view** | Operação real | Buscar membro, ver quota, ver lote disponível, registrar dispensação, recibo |
| **RT view mínima** | Liberação de lote + revisão | Listar lotes em quarentena, liberar lote, ver SNGPC pendente |
| Audit log read-only | Auditoria começa do dia 1 | Tela de eventos filtráveis por data/usuário/recurso |
| Pending Actions básico | Two-step approval funcional | Listar/aprovar PendingActions (preparado para MCP write em v0.5) |
| Trace Report PDF | Evidência para a associação | Relatório por membro: prescrições, dispensações, lotes, quotas, datas |
| Export CSV/JSON | Portabilidade LGPD Art. 18 V | Export de dados de membro em formato estruturado |

**Adiado para v0.3 (UI):** Diretoria dashboard, DPO view completa, Auditor view, KPIs visuais, MCP read-only.

**Done when (release):** uma associação piloto registra dispensação real e gera relatório auditável: quem recebeu, quanto, quando, com qual prescrição, de qual lote, dentro da quota, com saldo restante.

---

## v0.3 — Pilot Ready + MCP Read-Only (set/2026 → dez/2026)

Objetivo: 3–5 associações em produção piloto. Endurece o spine. Primeira porta agentic.

| Capability | Valor | Done when |
|---|---|---|
| UI por papel completa | DPO + Auditor + RT + Dispensador + Diretoria views | Cada papel tem dashboard próprio; RBAC filtrando no app-service |
| RBAC básico | Segregação de funções (RDC 1.014) | Roles: admin, dispensador, médico, financeiro, DPO. Testes de segregação passando. |
| TOTP para roles críticos | 2FA sem dependência de SaaS auth | `speakeasy` integrado; obrigatório para admin, DPO, financeiro |
| Backup/restore testado | Continuidade operacional | Script `backup.sh` + restore drill documentado em runbook |
| LGPD consent versionado | Conformidade Art. 8 | Versão do consentimento ativo armazenada com timestamp; histórico imutável |
| CPF hash + campos sensíveis cifrados | Conformidade Art. 11 | AES-256-GCM + Member Key derivada por PBKDF2; CPF SHA-256 + site_salt |
| CSV import | Onboarding sem fricção | Membros + prescrições importáveis de planilhas existentes |
| Crypto-deletion | Direito de eliminação Art. 18 IV | Endpoint `/members/:id/crypto-delete` apaga Member Key; testado end-to-end |
| **MCP server read-only** | Federação/auditor consulta via agente | Resources + Tools Nível 1 (`get_member_quota_summary`, `list_available_lots`, `generate_traceability_report`, `list_pending_compliance_items`); OAuth 2.1; auditoria de toda chamada MCP |
| **OpenAPI público + mcpo bridge** | Integradores tradicionais e Open WebUI consomem | `/openapi.json` autogerado; [mcpo](https://github.com/open-webui/mcpo) expõe MCP tools como OpenAPI para hosts não-MCP |
| **Open WebUI sidecar opcional** | "canna-oss AI Workbench" sem construir chat UI | Compose com `open-webui` consumindo MCP/OpenAPI; grupos mapeados para roles; documentação de deploy |

---

## v0.4 — Sandbox Dossier Ready + MCP Draft (jan/2027 → mai/2027)

Objetivo: associação consegue **candidatar-se ao sandbox** com evidências geradas pelo sistema. Agente prepara, humano aprova.

| Capability | Valor | Done when |
|---|---|---|
| Dossier template | Reduz barreira de candidatura | Template Plano de Capacidade Técnico-Operacional pronto, parametrizável por associação |
| KPI dashboard | Indicadores exigidos pela RDC 1.014 | 7 KPIs calculados em tempo real (dispensação, churn de membros, conformidade de quotas, etc.) |
| BSPO draft trimestral | Relatório de balanço auditável | BSPO gerado automaticamente em 15/jan, 15/abr, 15/jul, 15/out |
| RIPD template | Conformidade LGPD Art. 38 | RIPD pré-preenchido com operações de processamento documentadas |
| Evidências exportáveis | Bundle para dossier | ZIP com BSPO + KPIs + RIPD + audit log + relatórios de rastreabilidade |
| **MCP draft actions** | Agente prepara sem executar | Tools Nível 2 (`draft_dispensation`, `draft_kpi_report`, `draft_anvisa_dossier`, `draft_inventory_adjustment`); humano confirma na UI |
| **MCP prompts** | Workflows guiados | Prompts: `prepare_monthly_board_report`, `investigate_inventory_discrepancy`, `prepare_anvisa_dossier_section`, `review_sngpc_failures` |
| **MCP Apps básico (`packages/ui-apps/`)** | Telas operacionais dentro do agente | `MemberQuotaCardApp`, `TraceabilityTimelineApp`, `KpiDashboardApp`; reaproveitáveis no Admin Web |

---

## v0.5 — Regulatory Adapters + MCP Write with Approval (jun/2027 → dez/2027)

Objetivo: integração regulatória real + agente pode pedir ações operacionais com aprovação humana. Depende de schema/documentação Anvisa estável (SNCR API prazo: 30/09/2026).

| Capability | Valor | Done when |
|---|---|---|
| Compliance Adapter Layer | Arquitetura plugável | Interface comum para SNGPC, SNCR e futuros sistemas; mocks e prod separados |
| SNGPC adapter (mock → prod) | Movimentação/estoque oficial | XML validado contra XSD; ambiente de homologação Anvisa testado |
| SNCR adapter (se aplicável) | Prescrição eletrônica oficial | API Anvisa integrada quando disponível; fallback para registro manual |
| XML schema versioning | Sobrevive mudança de schema | Versão do schema referenciada em cada submissão; testes de contrato por versão |
| Retry/dead-letter queue | Submissão confiável | BullMQ com retry exponencial; falhas vão para DLQ com alerta |
| Protocol log | Evidência de submissão | Cada submissão Anvisa gera log imutável com payload, response, timestamp |
| **MCP write with approval** | Agente solicita ação operacional | Tools Nível 3 (`request_record_dispensation`, `request_release_lot`, `request_submit_report`); cria PendingAction; humano aprova na UI; approver registrado no evento |
| **MCP Apps completos** | Padrão MCP App + PendingAction | `DispensationReviewApp`, `PendingActionApprovalApp`, `InventoryLotPickerApp`, `InventoryDiscrepancyApp`, `SngpcPendingApp` |
| **REST API pública estável** | Integrações tradicionais | Versionamento `/v1/`; OpenAPI publicado; API keys por integração; IP allowlist por tenant |

---

## v1.0 — Full Association ERP + Agent Marketplace (2028)

Objetivo: produto completo. Galhos do tronco já validado. Federação e integradores externos conectam agentes próprios.

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
| **Agent marketplace / federation** | Federação/contador/auditor conectam agentes próprios | Per-tenant OAuth scopes; auditor read-only no event log; contador read-only no financeiro; jurídico read-only no dossier; federação opera múltiplas associações via 1 agente |
| **Canna Copilot (chat interno)** | Conversational UI dentro do admin | Usa mesmos MCP tools/apps; RBAC + approval flow + logs; nunca autônomo em Nível 3+. Renderiza `packages/ui-apps/` componentes inline. |

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
