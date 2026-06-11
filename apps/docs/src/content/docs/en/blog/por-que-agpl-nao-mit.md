---
title: "Why AGPL and not MIT for compliance infrastructure"
date: 2026-06-10
excerpt: "Choosing an OSS license is not a technical decision — it is a business and trust decision. For infrastructure that processes sensitive health data in a regulated sector, AGPL-3.0 is the only choice that closes canna-br's strongest commercial argument."
authors: gabriel
tags:
  - oss
  - licença
  - agpl
  - contribuição
  - arquitetura
---

Every OSS project faces the same conversation at some point: "why not MIT? it's simpler, more widely adopted, less controversial."

For most projects, MIT is a reasonable choice. For canna-br, it would be a mistake that destroys the product's strongest selling argument.

This post explains the logic behind the license — for contributors, for associations that will run the system, and for anyone thinking about forking it.

## The central argument

Medical cannabis associations operate in a regulatory grey area. The biggest operational risk a board faces is not functional — it is **loss of control over members' sensitive health data**.

A closed system, even one audited by third parties, offers no verifiable guarantee. The board has to trust the vendor's word. If the vendor changes ownership, changes policy, goes bankrupt, or is pressured by some authority — the association has no visibility.

AGPL-3.0 turns that argument into a concrete differentiator:

> "You can see every line of code that processes your members' data. Any lawyer at the association can review it. Any contributor can audit it. No closed SaaS can offer that."

That argument only works with AGPL. With MIT, it works in theory but not in practice — because MIT allows any fork to close the code and run it as proprietary SaaS, with no obligation to publish modifications.

## The AGPL limit: parasitic hosting

AGPL protects against those who **modify and host without publishing the code**. It does not protect against those who host without modifying.

The real risk for canna-br is not a hyperscaler. It's the local consultancy that takes the code, hosts it for five associations at R$ 500/month, and never contributes back — capturing value without paying the platform cost. That case is outside the protection scope of pure AGPL.

That's why we adopted the Metabase model: **AGPL + mandatory commercial license via CLA** for cases of third-party managed hosting, embedding in closed solutions, and integrations with legal certainty of derivative work. The CLA is the instrument that closes that loop without giving up OSI recognition or the auditability trust moat. Details at [OSS Model](/en/business/oss-model/).

> _Subject to legal review before taking effect._

## Why not BUSL

Business Source License is the favourite alternative for projects that want to "look like OSS" without being OSS.

BUSL makes code available with commercial restrictions for a period (usually 4 years), then converts to a more permissive licence. The problem is that association lawyers will not approve code with a restrictive licence as the basis for a members' health system. "Available but not open source" is the worst possible position: it loses the benefits of real auditability without gaining any regulatory protection.

If the central commercial argument is auditability, BUSL destroys it.

## Why not Open-Core

Open-core (free core, paid premium features) works when the buyer has budget and incentive to pay for additional functionality.

Brazilian cannabis associations do not fit that profile:

- Tight budget — all revenue goes toward operational costs of the cannabis product
- Collective decision-making — the board will not approve an "Enterprise tier" upgrade at a meeting
- Compliance is a legal obligation, not a differentiating feature — there is no "Premium SNGPC" or "LGPD Pro"

Open-core works with corporate buyers who have a software approval process and a dedicated budget. A non-profit civil association is not that profile.

## The AGPL/Commercial boundary in practice

AGPL-3.0 + CLA (Contributor License Agreement) is the model that allows canna-br to have a sustainable business without violating OSS logic.

The boundary works like this:

**Core AGPL — everything that is the product:**
- Association, member, and prescription registration
- Seed-to-dispensation traceability
- Dispensation, quota control, inventory
- RBAC, operational logs
- Basic LGPD, SNGPC, reports
- Public APIs, domain events, basic MCP connectors
- Internal technical ledger

**Commercial (external service, not closed modification):**
- Managed hosting, backups, observability, SLA
- Support and implementation
- Risk engine, billing, financial reconciliation
- Specialized auditing, executive BI
- Supplier marketplace
- Advanced financial/compliance MCP agents

The legal line is clear: modification of the core AGPL running over a network requires publication of the corresponding code. A separate service that consumes API or events can be closed commercial. Operations, hosting, support, and auditing are services — they do not need to open an internal playbook.

This means the InfraCo can charge for managed hosting, support, and complementary services without violating AGPL. The core code remains open. Any association can self-host without paying anything beyond infrastructure.

## What the CLA allows

The CLA (Contributor License Agreement) is the mechanism that enables dual-licensing. When you contribute to canna-br and sign the CLA, you retain your copyright — but you grant InfraCo the right to use your contribution in commercial contexts (such as managed hosting).

This is the same model used by Plausible, Bitwarden, and GitLab CE. It is not unusual, but it needs to be explicit before any contribution.

**What the CLA does not allow:** closing the core code. InfraCo cannot take community contributions and distribute them in a proprietary version without publishing the source.

## Trust moat on sensitive data

The auditability-based growth pattern is validated in other sectors:

- **Bitwarden** grew as an auditable alternative to LastPass. A password vault is exactly the profile of "sensitive data where trust cannot be promised, only demonstrated"
- **GitLab** built enterprise growth with "you can see everything, including GitLab's own code"
- **Sentry** has ~90% of users on the free self-hosted version — the business model works because the trust generated by transparency converts when scale grows

For health data in a regulatory grey area, the trust moat is even stronger. Association board members are **personally liable** for a health data breach. Using an auditable system — where the code that processes members' data is open and verifiable — concretely reduces that personal risk. The board can show any lawyer or auditor exactly what the system does with the data.

## A classic trap: the professional services model

OpenMRS and Bahmni are technically successful OSS health systems that were captured by the consultancy model:

- Revenue came primarily from implementation and customisations
- The core team essentially became a consultancy disguised as a product
- Zero scalability: revenue growth = linear headcount growth

canna-br has an explicit hard limit: a maximum of 20% of revenue from services. Any contracted service (migration, training, customisation) has an elimination schedule through documentation and automation.

If the business model depends on keeping the client dependent on services, AGPL solves nothing — the software may be open but the operational knowledge stays locked away. The right model is: the client grows in autonomy over time, and the InfraCo grows in scale, not in hours.

## How to contribute

The repository is being structured (a dedicated organisation is planned for v0.3, July 2026). In the meantime, development happens in an open working repository.

To contribute:
1. Read the ADRs before proposing architectural changes — the technical decisions have regulatory context that is not obvious
2. Any contribution to the core must respect AGPL-3.0
3. The CLA will be presented before merge — it is necessary for the business model to work
4. Open issues appear on the [public roadmap](/en/roadmap/)

If you want to discuss the licence, the business model, or how canna-br might fit a project you have, [write directly](mailto:gabriel@devmagic.com.br).

And if your association wants to be part of the pilot — using the system from the start and helping shape the product — [read about the pilot](/en/open/seed-associations/) and get in touch.

---

> **Machine-translated v1** — English version generated by LLM, human polish in progress. Report translation errors to gabriel@devmagic.com.br.
