import type { Dispensation } from "@canna/domain";
import { gramsToNumber } from "@canna/shared";
import type { SngpcSubmissionContext } from "./types.js";

/**
 * XML-escape the 5 special characters per W3C XML 1.0 §2.4.
 *
 * Pure string substitution — we deliberately avoid third-party XML libs in
 * the v0.2 spike. When `apps/docs/src/content/docs/research/sngpc.md` lands
 * the real XSD, swap this for a schema-validated builder.
 */
export const escapeXml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/**
 * Build the SNGPC dispensation XML envelope from a `DispensationRecorded`
 * domain event plus the association-level context.
 *
 * Shape mirrors the published farmácia schema with the four placeholder
 * fields documented for the patient-association sandbox (RDC 1.014):
 *   - cnpj
 *   - dispensingEntityCode
 *   - dispensationId (ULID — idempotency key on the ANVISA side)
 *   - memberRef (anonymised internal id, never CPF)
 *   - inventoryLotRef
 *   - prescriptionRef
 *   - quantityG
 *   - dispensedBy
 *   - approvedBy (optional)
 *   - occurredAt (ISO-8601 UTC)
 *
 * Real ANVISA XSD validation lands in v0.5; this builder is the contract
 * surface the BullMQ worker submits against.
 */
export const buildDispensationSngpcXml = (
  event: Dispensation.DispensationRecorded,
  context: SngpcSubmissionContext,
): string => {
  const p = event.payload;
  const approvedByLine =
    p.approvedBy === null
      ? ""
      : `    <approvedBy>${escapeXml(p.approvedBy)}</approvedBy>\n`;

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<dispensation xmlns="http://www.anvisa.gov.br/sngpc/v1" schemaVersion="1.0-placeholder">`,
    `  <header>`,
    `    <cnpj>${escapeXml(context.associationCNPJ)}</cnpj>`,
    `    <dispensingEntityCode>${escapeXml(context.dispensingEntityCode)}</dispensingEntityCode>`,
    `    <occurredAt>${event.occurredAt.toISOString()}</occurredAt>`,
    `  </header>`,
    `  <body>`,
    `    <dispensationId>${escapeXml(p.dispensationId)}</dispensationId>`,
    `    <associationRef>${escapeXml(p.associationId)}</associationRef>`,
    `    <memberRef>${escapeXml(p.memberRef)}</memberRef>`,
    `    <inventoryLotRef>${escapeXml(p.inventoryLotRef)}</inventoryLotRef>`,
    `    <prescriptionRef>${escapeXml(p.prescriptionRef)}</prescriptionRef>`,
    `    <quantityG>${String(gramsToNumber(p.quantityG))}</quantityG>`,
    `    <dispensedBy>${escapeXml(p.dispensedBy)}</dispensedBy>`,
    approvedByLine.length > 0 ? approvedByLine.trimEnd() : "",
    `  </body>`,
    `</dispensation>`,
  ]
    .filter((line) => line.length > 0)
    .join("\n");
};
