---
title: Roadmap
description: MCP-first agentic surface. Open WebUI + MCP server + MCP Apps substitui admin Next.js até pós-v1.0. Estrutura Slice Vertical (Capability+Valor+Done-when).
---

> **Princípio (revisado pós-pivot 2026-06-08):** spine-first **+** agentic-first.
> Tronco regulatório: Member → Prescrição → Quota → Lote → Dispensação → Audit Log → Relatório.
> Tronco de interface: **MCP server + MCP Apps + Open WebUI**. **NÃO existe admin Next.js no roadmap até pós-v1.0.** Tudo que era "admin view" virou MCP App contextual ou ficou no Ideas Park.

Premissas regulatórias canalizadas em [Premissas Regulatórias](/regulatory-assumptions/). Surface pivot documentado em [ADR-002 — MCP-first surface](/adr/0002-mcp-first-surface/) (substitui parcialmente [ADR-001](/adr/0001-domain-kernel-emmett/) na camada de interface).

---

## v0.1 — Domain Blueprint (DONE 2026-06-08)

| Capability | Valor | Done when |
|---|---|---|
| Domain Model + Event Storming | Vocabulário compartilhado eng+compliance+jurídico | Docs site com 8 bounded contexts + 38 domain events mapeados |
| Research consolidado | Base de premissas auditável | Marco legal, SNGPC, sandbox, mercado, modelos internacionais |
| OSS business model | Tese de viabilidade | AGPL-3 + managed hosting + Plausible como proxy |

---

## v0.2 — Domain Kernel + Spike Gate

### v0.2.0a — Emmett in-memory event store (DONE)

| Capability | Valor | Done when |
|---|---|---|
| `@canna/domain` TS puro | Feedback rápido | `pnpm verify` em < 5s; 50 vitest GIVEN/WHEN/THEN |
| Membership decider | Estado de membro auditável | 8 eventos + 16 scenarios (success + rejection + transitions) |
| Inventory decider | Estado de lote auditável | 7 eventos + 14 scenarios |
| Dispensation use case | Core regulatório atômico | Cross-aggregate; 3-event single append + rejection events |
| `@canna/event-store` Emmett in-memory | ES kernel validado | 8 specs incluindo parallel-writers optimistic concurrency |
| `@canna/app-services` orchestration | Stream load → decide → append | 6 e2e specs incluindo concurrent same-lot dispensation |

### v0.2.0b — Emmett Postgres adapter (DONE)

| Capability | Valor | Done when |
|---|---|---|
| `createPostgresEventStore()` | Production-grade backend | Mesma `CannaEventStore` interface; Pongo+pg pool |
| testcontainers-postgres suite | Spike gate em PG real | 6 specs PG (append/read/aggregate/Date-revival/stale-version/parallel-writers) |
| **ADR-001 spike gate PASSED** | Emmett oficial | Parallel writers + stale version + concurrent dispensation TODOS verdes em PG real |

### v0.2.1 — Compliance Spine + MCP-First Surface (now → ago/2026)

Objetivo: provar core loop em **uma** associação **através do agente**. Sem admin Next.js. Sem cultivo. Sem multi-tenant. Open WebUI + MCP server + MCP Apps básico fechando a entrega.

| Capability | Valor | Done when |
|---|---|---|
| `apps/api` Fastify endpoints finos | Commands via HTTP (chamados por MCP) | POST /commands/register-member, /validate-prescription, /release-lot, /record-dispensation |
| `@canna/read-models` Drizzle projections | Queries sem hit no event store | member-list, dispensation-history, inventory-summary, member-quota, inventory-lot |
| Append-only audit log | Trilha imutável | PostgreSQL RULE bloqueia UPDATE/DELETE em `audit_log` |
| `@canna/crypto` envelope encryption | LGPD Art. 11 | Per-member random DEK encrypted with Site KEK; rotação trimestral |
| `@canna/sngpc` (mock) | XML schema pronto, submissão mockada | XSD válido; happy path + retry mock |
| Login/TOTP/RBAC mínimo | Auth funcional | JWT + speakeasy; roles DISPENSADOR + RT + DPO; OAuth scopes mapped to canna roles |
| **`apps/mcp` MCP server TypeScript** | Agente acessa domain | `@modelcontextprotocol/sdk` + `@modelcontextprotocol/ext-apps/server`; servido via stdio + SSE |
| **MCP Tools Nível 1 (read)** | Federação/auditor consulta | `get_member`, `get_member_quota`, `list_available_lots`, `list_pending_compliance_items`, `generate_traceability_report`, `explain_compliance_gap` |
| **MCP Tools Nível 2 (draft)** | Agente prepara, humano confirma | `draft_dispensation`, `draft_kpi_report`, `draft_inventory_adjustment` |
| **MCP Tools Nível 3 (write w/ approval)** | Agente solicita, humano aprova | `request_record_dispensation`, `request_release_lot`, `request_submit_report`; cria PendingAction; approver registrado no evento |
| **MCP Resources** | Read-only context | `canna://reports/kpi/current`, `canna://inventory/available-lots`, `canna://members/{id}/quota-summary`, `canna://dispensations/{id}/trace`, `canna://regulatory-assumptions` |
| **MCP Prompts** | Workflows guiados | `prepare_monthly_board_report`, `investigate_inventory_discrepancy`, `review_sngpc_failures` |
| **`packages/ui-apps/` MCP Apps básicos** | Telas operacionais dentro do chat | `MemberQuotaCardApp` (read-only), `TraceabilityTimelineApp` (read-only), `DispensationFormApp` (form → request Tool Nível 3 → PendingAction); ext-apps spec compliant |
| **`apps/openapi-bridge` (mcpo)** | Hosts OpenAPI-only consomem | `mcpo` wrapper expõe MCP tools como OpenAPI; documentado mas opcional (Open WebUI v0.9.6+ fala MCP nativo) |
| **Open WebUI sidecar OBRIGATÓRIO** | Primary product surface | docker-compose com `ghcr.io/open-webui/open-webui:v0.9.6` + Postgres backend; MCP server registrado via config file; OAuth 2.1 com scopes mapped; **Workspace Tools disabled** |
| Pending Actions tool | Two-step approval via chat | Tool `list_pending_actions`/`approve_pending_action`/`reject_pending_action`; renderizado por `PendingActionApprovalApp` |
| `@canna/sngpc` (real, async) | Submissão real ANVISA pós-aprovação | BullMQ job consumindo DispensationRecorded → gera XML → submete; falha não invalida dispensação |
| Trace Report PDF | Evidência via tool | MCP tool `generate_traceability_report` retorna PDF render + link armazenado |
| Export CSV/JSON LGPD Art. 18 V | Portabilidade | MCP tool `export_member_data` retorna bundle assinado |

**Done when (release v0.2.1):** Associação piloto registra dispensação real via **Open WebUI chat**: dispensador pergunta ao agente, agente abre `DispensationFormApp`, dispensador confirma, sistema emite 3 eventos atômicos, RT aprova PendingAction no chat (ou via approval Tool), audit log registra approver. Sem clique em admin web tradicional.

---

## v0.3 — Pilot Expansion + LGPD Hardening (set/2026 → dez/2026)

Objetivo: 3–5 associações em produção piloto. Endurece spine + crypto + auditor read-only.

| Capability | Valor | Done when |
|---|---|---|
| LGPD consent versionado | Conformidade Art. 8 | Versão do consentimento ativo armazenada com timestamp; histórico imutável |
| Crypto-deletion via MCP tool | Direito Art. 18 IV | `request_crypto_delete_member` (Tool Nível 3); aprovação DPO; DEK destruída; testes end-to-end. **NÃO via MCP autônomo** — requer co-presença DPO. |
| CPF hash + RBAC reforçado | Art. 11 + segregação | SHA-256 + site_salt; RBAC enforced em todo app-service |
| Backup/restore drill | Continuidade operacional | Script `backup.sh` + restore documentado em runbook |
| CSV import (Tool Nível 2) | Onboarding sem fricção | `draft_csv_import` → preview → `request_csv_import` aprovado por RT |
| **MCP Apps adicionais** | Cobertura operacional | `InventoryLotPickerApp` (FIFO), `MemberSearchApp`, `SngpcPendingApp`, `BackupStatusApp` |
| Auditor read-only role | Compliance externa | OAuth scope `canna:auditor`; MCP tools filtrados a Nível 1; renderiza `AuditTimelineApp` |
| Federação read-only multi-associação | 1 agente vê N associações | OAuth scope `canna:federation`; switchable tenant context |
| KPI dashboard (MCP App) | Indicadores RDC 1.014 | `KpiDashboardApp` render de 7 KPIs (dispensação, churn, conformidade quotas, etc.) |

---

## v0.4 — Sandbox Dossier Ready (jan/2027 → mai/2027)

Objetivo: associação candidata-se ao sandbox com evidências geradas via chat.

| Capability | Valor | Done when |
|---|---|---|
| Dossier template | Reduz barreira de candidatura | Template Plano de Capacidade Técnico-Operacional gerado por `draft_anvisa_dossier_section` + `prepare_anvisa_dossier_section` prompt |
| BSPO draft trimestral | Relatório de balanço auditável | BSPO gerado automaticamente em 15/jan/abr/jul/out; revisado por RT via `BspoReviewApp` |
| RIPD template | Conformidade LGPD Art. 38 | RIPD pré-preenchido por agente; aprovado por DPO via `RipdReviewApp` |
| Evidências exportáveis | Bundle para dossier | MCP tool `bundle_dossier_evidence` retorna ZIP (BSPO + KPIs + RIPD + audit + traceability) |
| DPO view completa (MCP Apps) | Compliance DPO | `LgpdRequestsApp` (Art. 18 inbox), `RipdEditorApp`, `ConsentAuditApp` |
| Anvisa sandbox application flow | Submissão real | Tool Nível 3 `submit_sandbox_application` com aprovação Diretoria |

---

## v0.5 — Regulatory Adapters Real (jun/2027 → dez/2027)

Objetivo: SNGPC + SNCR real. Depende de schema/documentação Anvisa estável (SNCR API prazo: 30/09/2026).

| Capability | Valor | Done when |
|---|---|---|
| `@canna/sngpc` (prod) | Submissão real Anvisa | XML validado contra XSD oficial; ambiente homologação Anvisa testado |
| `@canna/sncr` adapter | Prescrição eletrônica oficial | API Anvisa integrada quando disponível; fallback registro manual |
| Compliance Adapter Layer | Plugável | Interface comum; mocks e prod separados; schema versioning per release |
| Retry/dead-letter queue | Submissão confiável | BullMQ retry exponencial; DLQ com alerta via MCP `list_sngpc_failures` |
| Protocol log | Evidência imutável | Cada submissão Anvisa gera log com payload, response, timestamp |
| **MCP Apps regulatórios** | Operação Anvisa via chat | `SngpcPendingApp`, `SncrSyncApp`, `ComplianceGapApp` |
| REST API pública v1 | Integrações tradicionais | `/v1/`; OpenAPI publicado; API keys + IP allowlist por tenant |

---

## v1.0 — Full Association Backend + Agent Marketplace (2028)

Objetivo: produto completo. Cultivo, processing, lab, financeiro full. Federação multi-tenant.

| Capability | Valor | Done when |
|---|---|---|
| Cultivation | Cultivo rastreável | CultivationBatch → Plant ULID → Harvest. Estado por planta auditado. |
| Processing | Transformação rastreável | ProcessingRun: input lots → output product lot. Massa/perdas registradas. |
| Lab Sample + COA | Qualidade auditável | LabSample com COA; resultados vinculados ao lote |
| CPC 29 / IAS 41 | Contabilidade ativo biológico | Fair value de planta por estágio; integração financeiro |
| Multi-tenant | Hosting SaaS | Schema isolation + RLS; 5+ tenants em staging sem cross-leak |
| Self-serve onboarding | Aquisição escalável | Associação cria conta + configura em < 30min sem intervenção |
| Billing | Receita real | Stripe + NF-e via emissor externo |
| Kamal deploy | Deploy sem downtime | `kamal deploy` < 5min single-tenant; multi-tenant orquestrado |
| **Agent marketplace / federation** | Federação/contador/auditor conectam agentes próprios | Per-tenant OAuth scopes; auditor read-only event log; contador read-only financeiro; jurídico read-only dossier |
| **MCP Apps avançados** | Operação full ERP via chat | `CultivationOverviewApp`, `LabResultsApp`, `FinanceDashboardApp`, `BatchTraceabilityApp` |
| **Canna Copilot embutido** | Cockpit primário | Open WebUI continua sendo o canal; nada de admin Next.js mesmo agora — chat + MCP Apps cobrem 100% das telas operacionais |

---

## v2.0 — Scale + LATAM (2029+)

| Capability | Valor | Done when |
|---|---|---|
| LATAM expansion | CO / MX / AR | Compliance adapter por jurisdição |
| Módulo clínico (SaMD?) | Acompanhamento paciente | Avaliação RDC 657 Classe I concluída ou descartada com fundamento |
| B2G analytics | Dashboard ANVISA | Contrato piloto com órgão regulador |
| R$1.87M ARR | Sustentabilidade | 120 associações pagantes |

---

## Ideas Park

Apostas que dependem de premissas *Especulativas* ou exigem validação prévia. Não entram no roadmap até a aposta ser validada com 1 cliente real.

- **Admin Next.js standalone** — descartado em 2026-06-08. Caso surja necessidade (ex: associação sem condições de operar via chat), avaliar como fallback PWA; até lá, MCP Apps cobrem o universo operacional.
- **StrainCatalog** — catálogo de strains medicinal BR (bounded context separado; seed OpenTHC/vdb + Kushy). Gatilho: implementação do Chain of Custody OU primeira associação piloto cultivando variedade própria. [research](/research/strain-databases/)
- App mobile PWA para membros (dispensação self-service com assinatura digital)
- IoT integration para cultivo (sensores temperatura/umidade)
- AI compliance alerts (análogo ao "Hanna" da Cannanas DE)
- Federação LATAM: schema adapter por jurisdição
- B2B revenue share com laboratórios homologados
- Marketplace de produtos entre associações (intra-RDC 1.014)
