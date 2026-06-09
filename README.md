# canna-br

OSS para gestão de associações de cannabis medicinal no Brasil.

**Site**: https://canna-br.fonsecagabriel.com.br
**Status**: alpha (v0.2.1.2) · pre-MVP · co-design com associações seed
**Licença**: AGPL-3.0

## O que é

- MCP-first surface (Open WebUI + 3 MCP Apps validados end-to-end)
- Event-sourced domain kernel (Emmett ES — gating de licença)
- LGPD-by-design: AES-256-GCM por membro + crypto-deletion (Art. 18 IV)
- Spine de compliance operacional: associados, dispensação, rastreabilidade
- Cultivo, financeiro, integração SNGPC real: roadmap v1.0 (2028)

## O que não é (ainda)

- Não é SaaS pronto para produção
- Não é substituto de DPO, RT farmacêutica ou consultoria jurídica
- SNGPC integração real depende de XSD ANVISA (pendente)

Detalhes: https://canna-br.fonsecagabriel.com.br/trust/

## Por que código aberto

Sistema que toca dados de saúde de pacientes cannabis precisa ser auditável pela diretoria da própria associação. AGPL-3.0 + repo público = qualquer advogado da associação revisa cada linha antes de adoção.

## Roadmap

https://canna-br.fonsecagabriel.com.br/roadmap/

## Como contribuir

Pre-código-público (v0.3 jul/2026), o canal principal é co-design com associações seed:

- Aplicar como associação piloto: https://canna-br.fonsecagabriel.com.br/open/seed-associations/
- Discussion (regulatório / arquitetura): GitHub Discussions deste repo
- Issues (bugs do site / docs): GitHub Issues deste repo

## ADRs

Decisões arquiteturais publicadas (mirrored do vault de desenvolvimento):
- ADR-001: Event Sourcing + Domain Kernel
- ADR-002: MCP-first (sem admin Next.js)
- ADR-003: AES-256-GCM por membro
- ADR-004: append-only audit via Postgres RULES
- ADR-005: Vídeo candidatura piloto

(Renderizado em https://canna-br.fonsecagabriel.com.br/build/big-picture/)

## Stack

Node 22 · TypeScript · Emmett (event sourcing) · Postgres 16 · Drizzle · BullMQ · Redis · Open WebUI · MCP SDK

## Maintainer

Gabriel Fonseca — gabryelfs@gmail.com — DPO técnico interino (conflito de interesse declarado em /trust/dpo/).
