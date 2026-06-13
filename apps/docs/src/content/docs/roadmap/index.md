---
title: Roadmap
description: MCP-first agentic surface. Open WebUI + MCP server + MCP Apps substitui admin Next.js até pós-v1.0. Estrutura Slice Vertical (Capability+Valor+Done-when).
---

> **Princípio (revisado pós-pivot 2026-06-08):** spine-first **+** agentic-first.
> Tronco regulatório: Member → Prescrição → Quota → Lote → Dispensação → Audit Log → Relatório.
> Tronco de interface: **MCP server + MCP Apps + Open WebUI**. **NÃO existe admin Next.js no roadmap até pós-v1.0.** Tudo que era "admin view" virou MCP App contextual ou ficou no Ideas Park.

Premissas regulatórias canalizadas em [Premissas Regulatórias](/regulatory-assumptions/). Surface pivot documentado em [ADR-002 — MCP-first surface](/adr/0002-mcp-first-surface/) (substitui parcialmente [ADR-001](/adr/0001-domain-kernel-emmett/) na camada de interface).

---

## Fundações pré-0.1 (já feitas)

> Não são uma "versão entregue" — são o trabalho de base que habilita a v0.1.0. A numeração do roadmap reflete **valor entregue ao usuário**, não progresso interno de engenharia. Por isso esse trabalho não recebe número de release.

| Fundação | Valor | Estado |
|---|---|---|
| Domain Model + Event Storming | Vocabulário compartilhado eng+compliance+jurídico | 8 bounded contexts + 38 domain events mapeados no docs site |
| Research consolidado | Base de premissas auditável | Marco legal, SNGPC, sandbox, mercado, modelos internacionais |
| OSS business model | Tese de viabilidade | AGPL-3 + managed hosting + analytics proxy |
| Emmett kernel spike (`@canna/domain` + `@canna/event-store`) | Decider pattern + optimistic concurrency validados | In-memory + Postgres adapter verdes em PG real (parallel writers + stale version). É o **caminho self-host** (dual model com SurrealDB gerenciado) |

---

## v0.1.0 — Hardening em curso rumo a um v0.1 funcional

> **Estado honesto (2026-06-12):** o domínio (membros, dispensação com aprovação, rastreabilidade, trilha, cotas, criptografia por membro, MCP server inline) está implementado e a tag `v0.1.0` já existe. O que está em curso agora é o **hardening** que falta para o sistema ser de fato **usável de ponta a ponta** — não declaramos "v0.1 funcional" ainda. A rodada atual fechou **7 bloqueadores** (6 corrigidos + 1 retido por decisão de honestidade) e elevou a suíte para **216/216 testes verdes em 12 workspaces**.

### Bloqueadores tratados nesta rodada (7)

| # | Bloqueador | Como ficou |
|---|---|---|
| 1 | MCP server não anunciava `resources` | Capability `resources` + handlers ListResources/ReadResource servindo os 4 bundles de ui-apps — antes **todo render de widget retornava 500** |
| 2 | Segregação de funções (RDC 1.014) | Guard rejeita dispensação quando `approvedBy === dispensedBy` (`APPROVAL_SEGREGATION_VIOLATION`) |
| 3 | SNGPC sem retry | Retry BullMQ (3 tentativas + backoff exponencial) — falha transitória não manda mais uma submissão regulatória pro dead-letter |
| 4 | `apps/agent` não buildava standalone | Fork vendorizado do dist do assistant-ui (Option B) + patch `packageExtensions` pro bug de manifest faltante do `@event-driven-io/emmett-postgresql` (testes de event-store restaurados) |
| 5 | `get_member_quota` retornava 0% sempre | Agora devolve `consumedG`/`remainingG` reais; `MemberQuotaCard` mostra dado verdadeiro |
| 6 | `member-lifecycle-board` mentia | **Retido do registry por decisão de honestidade** — seu agregado cross-member não tem read-model que o sustente ainda; sentinela `primaryToolName: __unavailable__`. Honestidade > widget que mente |
| 7 | Flag de onboarding hardcoded `true` | Derivada de stats reais |

### QA desta rodada

- **Render de widget keyless — PASS.** Smoke via chrome-devtools sem chave: 3 widgets lançáveis (`member-quota-card`, `traceability-timeline`, `dispensation-form`) renderizam ao vivo com **zero erro de console**; `member-quota-card` mostra dado real (7g/30g). Harness: `apps/mcp/scripts/qa-render-harness.ts`.
- **Loop de chat completo — PARCIAL (render inline ao vivo PROVADO; data-populate pendente).** Validado em chrome-devtools (apps/agent → apps/mcp via HTTP, chave OpenRouter): mensagem → Claude chama `get_member_quota` → dado real do Postgres (7g/23g) → **o widget renderiza INLINE no chat**, zero erro de console. O processo destravou 3 bugs reais que os testes in-memory não pegavam (transport stateless por-request, `_meta` slash-form `ui/resourceUri`, headers de auth `x-canna-*` — todos corrigidos). **Resta:** a população de números *dentro* do card fica em "Loading" — handoff host→iframe do assistant-ui (instabilidade de args / `part.result`), em investigação. O card aparece vivo; ainda não preenche via postMessage.

| Capability | Valor | Estado |
|---|---|---|
| Cadastro e gestão de membros | Associação opera membros no domínio | Membro Cadastrado → Suspenso → Reintegrado + listas escopadas por tenant |
| Dispensação com aprovação RT | Operação regulatória auditada | Dispensação registrada + PendingAction aprovada pela RT antes de commit + guard de segregação de funções |
| Rastreabilidade de lote | Cadeia de custódia auditável | Lote → Dispensação → Membro; relatório de rastreabilidade por lote |
| Trilha de auditoria imutável | LGPD art. 37 + compliance | Append-only `audit_log`; UPDATE/DELETE bloqueados em produção |
| Cotas por prescrição | Controle de dispensação seguro | Cota mensal derivada da prescrição; dispensação barra se cota excedida; quota consumida real exposta no widget |
| Criptografia por membro (LGPD) | Art. 11 — dado sensível protegido | DEK aleatória por membro criptografada com KEK da instância; rotação documentada |
| MCP server inline | Agente acessa domain via tools | `apps/mcp` rodando junto ao `apps/api`; tools Nível 1–3 operacionais + capability `resources` servindo os 4 bundles ui-apps |
| 216/216 testes verdes | Fundação verificada | Suite completa passa em CI nos 12 workspaces; zero regressão em domínio + infra |

**Done-when (v0.1 funcional):** ainda não atingido. O loop de chat roda ao vivo e o widget renderiza inline, mas falta o card **preencher os dados** (handoff assistant-ui em investigação) e promover o `member-lifecycle-board` a widget vivo (precisa de um tool `get_member_lifecycle` + read-model de enumeração — **deferido para além do v0.1**). Quando o card popular ao vivo, o sistema é usável de ponta a ponta: operador provisiona associação via MCP Operacional; associação gerencia membros, registra dispensações com aprovação RT, consulta rastreabilidade e histórico — tudo via chat com widgets inline.

---

## v0.2 — Multi-tenant + Onboarding Self-serve

Objetivo: **múltiplas associações isoladas** numa instância + **onboarding self-serve** (associação cria conta sem intervenção do operador). Aqui entram login multi-tenant (Zitadel Cloud · OIDC/PKCE), isolamento de streams por tenant e o fluxo completo de primeiro acesso via MCP App. Detalhamento (EventStorming + MCP Operacional + UseCaseMatrix + arquitetura): [v0.2 detalhada](/roadmap/v0-1-0/).

| Capability | Valor | Done when |
|---|---|---|
| MCP Operacional interno (provisionamento) | Operador libera tenant sem formulário | `provision_association` + `seed_admin_user` (cred. temp · `must_change_credentials`); tenant isolado + namespace de streams |
| Onboarding de primeiro acesso | Associação define seu próprio acesso real | MCP App `onboarding-credential-setup`: troca e-mail+senha, revoga credencial temporária |
| Login multi-tenant (Zitadel Cloud · OIDC/PKCE · região EU) | Auth gerenciada, contexto isolado por tenant | Admin entra com sessão escopada ao tenant; sem auth self-built |
| Isolamento por tenant | Dado de uma associação invisível para outra | Streams + read-models namespaced; teste cross-tenant nega acesso |
| Dashboard básico do tenant | Visão operacional mínima | Read-model escopado ao tenant via SurrealDB LIVE SELECT (síncrono, sem bus assíncrono) |
| Event store SurrealDB (gerenciado) | Trilha append-only por stream na infra viva | Adapter SurrealDB (`es_stream`/`es_event` + `ExpectedVersionConflictError`) atrás do port `CannaEventStore`, ns=canna na instância compartilhada |

**Done when (release v0.2):** duas associações distintas fazem onboarding na mesma instância, cada uma loga no seu tenant, opera membros e vê apenas os seus dados. Nenhum vazamento entre tenants. Documentado para self-host e gerenciado.

---

## v0.3 — Pilot Hardening (RBAC / TOTP / consent / crypto-deletion / CSV)

Objetivo: 3–5 associações em produção piloto. Endurece RBAC, TOTP, consentimento versionado, crypto-deletion e importação CSV.

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
| Retry/dead-letter queue | Submissão confiável | Retry exponencial + DLQ sobre o bus NATS JetStream; alerta via MCP `list_sngpc_failures` |
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
| Multi-tenant em escala | Hosting SaaS robusto | Isolamento de streams + RLS endurecidos; 50+ tenants em staging sem cross-leak (multi-tenant funcional desde v0.2; aqui = escala e hardening) |
| Billing | Receita recorrente gerenciada | Stripe + NF-e via emissor externo; planos por tenant configuráveis via MCP Operacional |
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
