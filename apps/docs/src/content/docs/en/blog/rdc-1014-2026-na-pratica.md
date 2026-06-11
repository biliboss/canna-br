---
title: "RDC 1.014/2026 in practice: what changes for cannabis associations"
date: 2026-06-10
excerpt: "RDC 1.014/2026 came into effect on August 4, 2026, and created the first formal administrative regime for patient associations in Brazil. What changes operationally — and what needs to be in place before inspectors arrive."
authors: gabriel
tags:
  - regulação
  - rdc-1014
  - anvisa
  - compliance
  - associações
---

> **Legal notice:** this post is informational and does not substitute legal advice. Each association has a specific situation. Consult a specialised lawyer before making decisions based on this content.

For nearly twenty years, medical cannabis associations in Brazil operated under an improvised legal regime: a collective Habeas Corpus granted by the local judiciary, periodically renewed, with no national uniformity and no clear administrative oversight.

That changed with RDC 1.014/2026.

## What RDC 1.014 is

ANVISA's Collegiate Board Resolution 1.014/2026 created the first formal "regulatory sandbox" for medical cannabis patient associations in Brazil. Effective date: August 4, 2026.

What it does, in practice:

- Creates an **administrative authorisation** regime for associations approved for the sandbox
- Transfers **primary oversight from the judiciary to ANVISA**
- Establishes a set of **operational obligations** that associations must fulfil to maintain authorisation

Before the RDC, protection was judicial — each association negotiated its HC with the local judiciary. With the RDC, there is an administrative path, but it comes with concrete requirements.

## What stays the same

Associations that do not apply for the sandbox continue under the previous regime: collective HC, criminal risk on board members, indirect oversight. The RDC does not revoke the previous regime — it creates an alternative. For those in the sandbox, the logic changes completely.

Also unchanged: cannabis remains a controlled substance. The regulation authorises operation within specific rules; it does not decriminalise in a broad sense.

## What changes for those who enter the sandbox

**Direct inspection.** ANVISA becomes the supervising authority. This means inspection visits, documentary audits, and the possibility of suspension or revocation of authorisation for non-compliance.

**Absolute prohibitions that must be enforced in the system:**

| Prohibition | Operational meaning |
|---|---|
| Commercialisation forbidden | No financial transactions for the cannabis product itself |
| Members only | Dispensation restricted to the active associative membership |
| Non-profit | All revenue goes to operations and research; distribution of surplus is forbidden |
| Advertising forbidden | No promotional material for products or services |

**Mandatory traceability.** The RDC requires that every dispensation, transfer, and product event be recorded and verifiable. This includes the complete chain: where the input came from, which batch, which COA (Certificate of Analysis), who received it, in what quantity, based on which valid prescription.

**SNGPC.** The National Controlled Products Management System — today used by pharmacies to record dispensation of controlled substances — becomes a requirement for sandbox associations. Associations must submit periodic dispensation records in ANVISA's format.

**RBAC with segregation of duties.** The RDC implies that different roles within the association (director, pharmaceutical technical manager, cultivator, dispenser) must be clearly defined in the system, with a log of who did what. Separating this in practice is not enough — it must be in the record.

**LGPD applied to sensitive health data.** Members' data (diagnosis, prescription, dosage, usage history) are sensitive data under LGPD (Art. 5 II). This requires: explicit consent, restricted access control, the possibility of effective deletion (Art. 18 IV), and — for those using an external system — processing agreements with the supplier.

## Why spreadsheets no longer cut it

Associations operating with Google Sheets, WhatsApp, and parallel spreadsheets face growing risk for a simple reason: these systems do not produce a verifiable audit trail.

When an ANVISA inspector asks for the dispensation history of batch LT-001, the answer cannot be "let me look through the records". It needs to be: here is the event with timestamp, hash, responsible party, quantity, link to the patient's prescription, and corresponding inventory deduction.

A spreadsheet has no idempotency. It can be edited retroactively. It has no verification hash. It has no RBAC. In an audit, the absence of these properties is a problem that no justification resolves.

## What needs to be in place

For an association that wants to enter the sandbox or prepare for administrative inspection, the minimum operational checklist is:

- **Member registry** with documented LGPD consent, health data segregated
- **Batch traceability** from input to final dispensation
- **Dispensation records** linked to a valid prescription, quantity, batch, and dispenser
- **Quota control** — each member has a prescribed limit; the system must validate this before registering the dispensation
- **SNGPC** — capability to generate and submit reports in ANVISA's format
- **Immutable audit trail** — history that cannot be edited retroactively
- **RBAC** — each user can only do what their role permits; everything logged

This is exactly what canna-br delivers, built with the RDC as reference from the start.

## Personal liability of board members

A point that does not appear in the text of the resolution but that any specialised lawyer will mention: the RDC does not eliminate the personal liability of association board members.

In the event of a health data breach affecting members, LGPD imposes civil and, in some cases, criminal liability. In the event of a serious operational irregularity, the collective HC may be challenged. The sandbox's administrative authorisation is not a shield against any kind of irregularity.

Using a system that can be publicly audited — where the code that processes members' data is open and verifiable — is a concrete way to reduce that personal risk. The board can show any lawyer or auditor exactly what the system does with the data.

## What canna-br is building now

The system is at v0.2.1 with 154 passing tests. The dispensation, batch traceability, and quota control modules are implemented. SNGPC is in mock — the XSD schema specific to associations has not yet been published by ANVISA, but the architecture is ready for integration when the document is released.

The pilot is being structured with associations that want to build this standard from the start — not adapt a generic system after inspectors arrive.

If your association is evaluating how to prepare for the new regulatory regime, [get in touch](mailto:gabriel@devmagic.com.br) or see the technical compliance documentation at [/en/build/compliance/](/en/build/compliance/).

---

> **Machine-translated v1** — English version generated by LLM, human polish in progress. Report translation errors to gabriel@devmagic.com.br.
