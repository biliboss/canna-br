---
title: Roadmap
---

# canna-oss Roadmap

## v0.1 — Validação (now → ago/2026)

| Capability | Valor | Done when |
|---|---|---|
| Domain Model + Event Storming | Blueprint DDD completo | Docs site com event storming mapeado |
| Entrevistas com associações | Validação de hipóteses | 5+ entrevistas documentadas |
| MVP Dispensação | Core loop funcional | Dispensação → audit log → quota check |
| SNGPC homologação | Integração real | XML enviado no ambiente de teste ANVISA |

## v0.2 — Sandbox Ready (ago/2026 → mar/2027)

| Capability | Valor | Done when |
|---|---|---|
| Compliance Engine | Relatórios automáticos | BSPO + KPI + DRE gerados sem intervenção manual |
| Dossier Template | Reduz barreira candidatura | Template Plano de Capacidade Técnico-Operacional pronto |
| RBAC + Segregação | RDC 1.014 compliance | Testes de segregação de funções passando |
| LGPD Crypto-deletion | Compliance LGPD Art. 18 | Crypto-deletion testado end-to-end |

## v0.3 — Managed Hosting (Q2 2027)

| Capability | Valor | Done when |
|---|---|---|
| Multi-tenant | Schema isolation + RLS | 5+ tenants isolados em staging |
| Self-serve onboarding | Sem intervenção manual | Associação cria conta + configura em < 30min |
| Billing | Revenue real | Stripe + NF-e integrado |
| Kamal deploy | Deploy sem downtime | `kamal deploy` em < 5min |

## v0.4 — Scale (2028+)

| Capability | Valor | Done when |
|---|---|---|
| LATAM expansion | CO / MX / AR | Adapter de compliance por país |
| Módulo clínico (SaMD?) | Acompanhamento paciente | Avaliação RDC 657 Classe I concluída |
| B2G analytics | ANVISA dashboard | Contrato piloto ANVISA |
| R$1.87M ARR | Sustentabilidade | 120 associações pagantes |

## Ideas Park

- App mobile PWA para membros (dispensação self-service com assinatura digital)
- IoT integration para cultivo (sensores temperatura/umidade)
- AI Hanna-like para compliance KPI alertas (análogo ao Cannanas DE)
- Federação LATAM: schema adapter por jurisdição
