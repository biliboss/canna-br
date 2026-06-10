import { describe, expect, it } from "vitest";
import {
  event,
  isErr,
  isOk,
  quantityGrams,
  type DomainEvent,
  type QuantityGrams,
  type ULID,
} from "@canna/shared";
import type { Dispensation } from "@canna/domain";
import {
  buildDispensationSngpcXml,
  escapeXml,
  isSngpcSubmissionOk,
  submitMockSngpc,
  validateSngpcXml,
} from "../index.js";

const grams = (n: number): QuantityGrams => {
  const r = quantityGrams(n);
  if (!isOk(r)) throw new Error(`bad grams: ${String(n)}`);
  return r.value;
};

const id = (s: string): ULID => s as ULID;

const sampleEvent = (
  override: Partial<Dispensation.DispensationRecorded["payload"]> = {},
): Dispensation.DispensationRecorded => {
  const payload: Dispensation.DispensationRecorded["payload"] = {
    dispensationId: id("01J0DSP0000000000000000001"),
    associationId: id("01J0ASSOC00000000000000001"),
    memberRef: id("01J0MEMBER0000000000000001"),
    inventoryLotRef: id("01J0LOT00000000000000000001"),
    prescriptionRef: id("01J0PRESC000000000000000001"),
    quantityG: grams(2.5),
    dispensedBy: id("01J0USER000000000000000001"),
    approvedBy: id("01J0USER000000000000000002"),
    ...override,
  };
  const e: Dispensation.DispensationRecorded = event(
    "DispensationRecorded",
    `association:${payload.associationId}:dispensations`,
    new Date("2026-06-08T12:34:56.000Z"),
    payload,
  ) as DomainEvent<"DispensationRecorded", typeof payload>;
  return e;
};

const ctx = {
  associationCNPJ: "00.000.000/0001-00",
  dispensingEntityCode: "ENT-123",
};

describe("escapeXml", () => {
  it("escapes the 5 XML special characters", () => {
    expect(escapeXml(`& < > " '`)).toBe(`&amp; &lt; &gt; &quot; &apos;`);
  });

  it("leaves benign strings alone", () => {
    expect(escapeXml("hello world 123")).toBe("hello world 123");
  });
});

describe("buildDispensationSngpcXml", () => {
  it("produces a well-formed XML envelope with mandatory fields", () => {
    const xml = buildDispensationSngpcXml(sampleEvent(), ctx);
    expect(xml.startsWith(`<?xml version="1.0" encoding="UTF-8"?>`)).toBe(true);
    expect(xml).toContain("<dispensation");
    expect(xml).toContain("</dispensation>");
    expect(xml).toContain("<cnpj>00.000.000/0001-00</cnpj>");
    expect(xml).toContain("<dispensingEntityCode>ENT-123</dispensingEntityCode>");
    expect(xml).toContain(
      "<dispensationId>01J0DSP0000000000000000001</dispensationId>",
    );
    expect(xml).toContain("<quantityG>2.5</quantityG>");
    expect(xml).toContain("<occurredAt>2026-06-08T12:34:56.000Z</occurredAt>");
  });

  it("escapes &, <, >, \" and ' inside payload strings", () => {
    const xml = buildDispensationSngpcXml(
      sampleEvent(),
      {
        associationCNPJ: `A&B<C>D"E'F`,
        dispensingEntityCode: `ENT-<bad>`,
      },
    );
    expect(xml).toContain(
      "<cnpj>A&amp;B&lt;C&gt;D&quot;E&apos;F</cnpj>",
    );
    expect(xml).toContain(
      "<dispensingEntityCode>ENT-&lt;bad&gt;</dispensingEntityCode>",
    );
    // The raw characters must not leak into the final XML
    expect(xml).not.toContain(`A&B`);
    expect(xml).not.toContain(`<bad>`);
  });

  it("omits <approvedBy> when null", () => {
    const xml = buildDispensationSngpcXml(
      sampleEvent({ approvedBy: null }),
      ctx,
    );
    expect(xml).not.toContain("<approvedBy>");
  });
});

describe("validateSngpcXml", () => {
  it("accepts a well-formed XML built from a sample event", () => {
    const xml = buildDispensationSngpcXml(sampleEvent(), ctx);
    const r = validateSngpcXml(xml);
    expect(isOk(r)).toBe(true);
  });

  it("rejects XML missing the <dispensation> root", () => {
    const r = validateSngpcXml("<random><cnpj>x</cnpj></random>");
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe("SNGPC_XML_MISSING_ROOT");
  });

  it("rejects XML missing a mandatory field", () => {
    const r = validateSngpcXml(
      `<dispensation><cnpj>x</cnpj><dispensingEntityCode>x</dispensingEntityCode><occurredAt>2026-06-08T00:00:00.000Z</occurredAt></dispensation>`,
    );
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe("SNGPC_XML_MISSING_FIELD");
  });
});

describe("submitMockSngpc", () => {
  it("returns a protocol number on success (default)", async () => {
    const xml = buildDispensationSngpcXml(sampleEvent(), ctx);
    const r = await submitMockSngpc(xml);
    expect(isSngpcSubmissionOk(r)).toBe(true);
    if (isSngpcSubmissionOk(r)) {
      expect(r.protocolNumber).toMatch(/^MOCK-SNGPC-/);
      expect(r.sentAt).toBeInstanceOf(Date);
    }
  });

  it("returns an error when failProbability=1 (deterministic)", async () => {
    const xml = buildDispensationSngpcXml(sampleEvent(), ctx);
    const r = await submitMockSngpc(xml, { failProbability: 1 });
    expect(isSngpcSubmissionOk(r)).toBe(false);
    if (!isSngpcSubmissionOk(r)) {
      expect(r.error).toMatch(/forced failure/);
    }
  });
});
