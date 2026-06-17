---
type: log
title: Log do bundle de domínio
description: Histórico de alterações do bundle OKF de conhecimento de domínio do canna-br.
tags: [okf, log]
---

# Log do bundle de domínio

## wave.13 — cb-w13-okf-domain (criação)

Bundle inicial de conhecimento de domínio, confirmado contra o código real (`packages/domain/`, `apps/mcp/src/tools/`):

- `rdc-1014-segregation.md` (`rule`) — fluxo de 2 etapas, guarda `APPROVAL_SEGREGATION_VIOLATION`, cota consumida no approve.
- `member-lifecycle.md` (`playbook`) — estados `EMPTY/PENDING_CONSENT/ACTIVE/SUSPENDED/ANONYMIZED` + transições + tool por transição.
- `monthly-quota.md` (`playbook`) — `validate_prescription` crava cota; `MemberQuotaConsumed` + projeção `member_quota` acumulam `consumed_g`.
- `roles-glossary.md` (`glossary`) — matriz capacidade × papel dos `allowedRoles` das tools.

### Divergências código vs spec do card (registradas, não inventadas)

- O card mencionava o estado `CONSENT_REVOKED`; o código **não tem** esse estado — `RevokeConsent` leva o membro a `SUSPENDED` (`packages/domain/src/membership/evolve.ts:21-26`). Documentado o comportamento real.
- A infra OKF da wave.12 (`scripts/validate-okf.sh`, host docsite) ainda não existia no momento da criação; usado `okf/domain/` por default. Validação E1/E2 feita manualmente (todos os `.md` têm `type` não-vazio + frontmatter parseável).
