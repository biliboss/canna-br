import {
  domainError,
  err,
  ok,
  type DomainError,
  type Result,
} from "@canna/shared";
import type { ValidatedXml } from "./types.js";

const REQUIRED_FIELDS = [
  "dispensation",
  "cnpj",
  "dispensingEntityCode",
  "occurredAt",
  "dispensationId",
  "associationRef",
  "memberRef",
  "inventoryLotRef",
  "prescriptionRef",
  "quantityG",
  "dispensedBy",
] as const;

const ISO_DATE_RE =
  /<occurredAt>(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)<\/occurredAt>/;

/**
 * Light-weight SNGPC XML validator.
 *
 * Real XSD-driven validation lands with the v0.5 SNGPC adapter once ANVISA
 * publishes the patient-association schema. Until then we check:
 *   1. `<dispensation>` root tag is present
 *   2. all mandatory header/body field tags are present
 *   3. `<occurredAt>` is a UTC ISO-8601 timestamp
 *
 * The branded `ValidatedXml` return type lets the worker statically prove
 * it only ships strings that passed this gate.
 */
export const validateSngpcXml = (
  xml: string,
): Result<DomainError, ValidatedXml> => {
  if (!xml.includes("<dispensation")) {
    return err(
      domainError(
        "SNGPC_XML_MISSING_ROOT",
        "SNGPC XML must contain a <dispensation> root element",
      ),
    );
  }

  for (const field of REQUIRED_FIELDS) {
    if (!xml.includes(`<${field}`)) {
      return err(
        domainError(
          "SNGPC_XML_MISSING_FIELD",
          `SNGPC XML missing mandatory field <${field}>`,
          { field },
        ),
      );
    }
  }

  if (!ISO_DATE_RE.test(xml)) {
    return err(
      domainError(
        "SNGPC_XML_BAD_DATE",
        "SNGPC XML <occurredAt> must be a UTC ISO-8601 timestamp",
      ),
    );
  }

  return ok(xml as ValidatedXml);
};
