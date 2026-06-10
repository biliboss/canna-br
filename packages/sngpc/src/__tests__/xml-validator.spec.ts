import { describe, expect, it } from "vitest";
import { isOk, isErr } from "@canna/shared";
import { validateSngpcXml } from "../xml-validator.js";

// ---------------------------------------------------------------------------
// Helpers — minimal valid XML and a factory for partial fragments
// ---------------------------------------------------------------------------

/** Minimal XML that satisfies all validator checks. */
const VALID_XML = `<?xml version="1.0" encoding="UTF-8"?>
<dispensation xmlns="http://www.anvisa.gov.br/sngpc/v1" schemaVersion="1.0-placeholder">
  <header>
    <cnpj>12.345.678/0001-99</cnpj>
    <dispensingEntityCode>ENT-456</dispensingEntityCode>
    <occurredAt>2026-06-09T10:00:00.000Z</occurredAt>
  </header>
  <body>
    <dispensationId>01J0DSP0000000000000000001</dispensationId>
    <associationRef>01J0ASSOC00000000000000001</associationRef>
    <memberRef>01J0MEMBER0000000000000001</memberRef>
    <inventoryLotRef>01J0LOT00000000000000000001</inventoryLotRef>
    <prescriptionRef>01J0PRESC000000000000000001</prescriptionRef>
    <quantityG>2.5</quantityG>
    <dispensedBy>01J0USER000000000000000001</dispensedBy>
  </body>
</dispensation>`;

/** Remove a specific tag pair from the valid XML to create a missing-field fixture. */
const withoutTag = (tag: string, xml = VALID_XML): string =>
  xml.replace(new RegExp(`\\s*<${tag}>[^<]*<\\/${tag}>`, "g"), "");

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe("validateSngpcXml — valid input", () => {
  it("returns ok for a fully valid SNGPC XML string", () => {
    const r = validateSngpcXml(VALID_XML);
    expect(isOk(r)).toBe(true);
  });

  it("returns the original XML string as the ok value (branded ValidatedXml)", () => {
    const r = validateSngpcXml(VALID_XML);
    if (!isOk(r)) throw new Error("Expected ok");
    expect(r.value).toBe(VALID_XML);
  });

  it("accepts XML with optional <approvedBy> present", () => {
    const withOptional = VALID_XML.replace(
      "</dispensedBy>",
      `</dispensedBy>\n    <approvedBy>01J0USER000000000000000002</approvedBy>`,
    );
    expect(isOk(validateSngpcXml(withOptional))).toBe(true);
  });

  it("accepts XML where optional <approvedBy> is absent — still valid", () => {
    // VALID_XML deliberately has no <approvedBy>; validator must not require it
    expect(VALID_XML).not.toContain("<approvedBy>");
    expect(isOk(validateSngpcXml(VALID_XML))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Missing root element
// ---------------------------------------------------------------------------

describe("validateSngpcXml — missing <dispensation> root", () => {
  it("returns err with code SNGPC_XML_MISSING_ROOT when root tag absent", () => {
    const r = validateSngpcXml("<document><cnpj>x</cnpj></document>");
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe("SNGPC_XML_MISSING_ROOT");
  });

  it("returns err for an empty string", () => {
    const r = validateSngpcXml("");
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe("SNGPC_XML_MISSING_ROOT");
  });

  it("returns err for completely malformed XML", () => {
    const r = validateSngpcXml("not xml at all");
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe("SNGPC_XML_MISSING_ROOT");
  });
});

// ---------------------------------------------------------------------------
// Missing mandatory fields — one test per required field
// ---------------------------------------------------------------------------

const REQUIRED_FIELDS = [
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

describe("validateSngpcXml — missing mandatory fields", () => {
  for (const field of REQUIRED_FIELDS) {
    it(`returns SNGPC_XML_MISSING_FIELD when <${field}> is absent`, () => {
      const r = validateSngpcXml(withoutTag(field));
      expect(isErr(r)).toBe(true);
      if (isErr(r)) {
        expect(r.error.code).toBe("SNGPC_XML_MISSING_FIELD");
        expect(r.error.message).toContain(field);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Invalid <occurredAt> formats
// ---------------------------------------------------------------------------

describe("validateSngpcXml — <occurredAt> format validation", () => {
  it("rejects a date-only string (no time component)", () => {
    const xml = VALID_XML.replace(
      "<occurredAt>2026-06-09T10:00:00.000Z</occurredAt>",
      "<occurredAt>2026-06-09</occurredAt>",
    );
    const r = validateSngpcXml(xml);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe("SNGPC_XML_BAD_DATE");
  });

  it("rejects a non-UTC timestamp (missing trailing Z)", () => {
    const xml = VALID_XML.replace(
      "<occurredAt>2026-06-09T10:00:00.000Z</occurredAt>",
      "<occurredAt>2026-06-09T10:00:00.000-03:00</occurredAt>",
    );
    const r = validateSngpcXml(xml);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe("SNGPC_XML_BAD_DATE");
  });

  it("accepts ISO-8601 UTC without milliseconds (seconds only)", () => {
    const xml = VALID_XML.replace(
      "<occurredAt>2026-06-09T10:00:00.000Z</occurredAt>",
      "<occurredAt>2026-06-09T10:00:00Z</occurredAt>",
    );
    expect(isOk(validateSngpcXml(xml))).toBe(true);
  });

  it("accepts ISO-8601 UTC with milliseconds", () => {
    // VALID_XML already uses this format — belt-and-suspenders assertion
    expect(VALID_XML).toContain("T10:00:00.000Z");
    expect(isOk(validateSngpcXml(VALID_XML))).toBe(true);
  });

  it("rejects a free-text string in <occurredAt>", () => {
    const xml = VALID_XML.replace(
      "<occurredAt>2026-06-09T10:00:00.000Z</occurredAt>",
      "<occurredAt>yesterday</occurredAt>",
    );
    const r = validateSngpcXml(xml);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe("SNGPC_XML_BAD_DATE");
  });
});

// ---------------------------------------------------------------------------
// Namespace — validator is namespace-agnostic (structural check only)
// ---------------------------------------------------------------------------

describe("validateSngpcXml — namespace handling", () => {
  it("accepts XML without a namespace declaration (structural check only)", () => {
    // Current validator checks tag presence, not namespace strings.
    // A namespace-stripped envelope still passes structural validation.
    const noNs = VALID_XML.replace(
      `<dispensation xmlns="http://www.anvisa.gov.br/sngpc/v1" schemaVersion="1.0-placeholder">`,
      `<dispensation>`,
    );
    // NOTE: The v0.2 validator is purely structural — it does NOT enforce the
    // xmlns attribute. This test documents that known limitation; real XSD
    // validation is deferred to v0.5. If this test starts FAILING after the
    // v0.5 namespace-validation upgrade, update it to expect isErr.
    expect(isOk(validateSngpcXml(noNs))).toBe(true);
  });

  it("documents substring-check limitation: <dispensationId> body field satisfies <dispensation root check", () => {
    // The v0.2 validator uses xml.includes("<dispensation") — a substring
    // match that is satisfied by <dispensationId> in the body even when the
    // root element is renamed. This test documents (not fixes) that known
    // limitation; real XSD root validation is deferred to v0.5.
    const wrongRoot = VALID_XML
      .replace(
        `<dispensation xmlns="http://www.anvisa.gov.br/sngpc/v1" schemaVersion="1.0-placeholder">`,
        `<submission xmlns="http://www.anvisa.gov.br/sngpc/v1">`,
      )
      .replace("</dispensation>", "</submission>");
    // <dispensationId> still present → substring check passes → isOk
    expect(isOk(validateSngpcXml(wrongRoot))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Return type contract — never throws
// ---------------------------------------------------------------------------

describe("validateSngpcXml — never throws", () => {
  it("does not throw for null-ish coercions (empty string, whitespace)", () => {
    expect(() => validateSngpcXml("")).not.toThrow();
    expect(() => validateSngpcXml("   ")).not.toThrow();
  });

  it("does not throw for very large strings", () => {
    const big = VALID_XML + "\n<!-- " + "x".repeat(100_000) + " -->";
    expect(() => validateSngpcXml(big)).not.toThrow();
  });
});
