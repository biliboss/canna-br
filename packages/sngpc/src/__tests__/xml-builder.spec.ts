import { describe, expect, it } from "vitest";
import {
  isOk,
  quantityGrams,
  event,
  type DomainEvent,
  type QuantityGrams,
  type ULID,
} from "@canna/shared";
import type { Dispensation } from "@canna/domain";
import { buildDispensationSngpcXml, escapeXml } from "../xml-builder.js";
import type { SngpcSubmissionContext } from "../types.js";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const grams = (n: number): QuantityGrams => {
  const r = quantityGrams(n);
  if (!isOk(r)) throw new Error(`invalid grams: ${String(n)}`);
  return r.value;
};

const id = (s: string): ULID => s as ULID;

const basePayload = (): Dispensation.DispensationRecorded["payload"] => ({
  dispensationId: id("01J0DSP0000000000000000001"),
  associationId: id("01J0ASSOC00000000000000001"),
  memberRef: id("01J0MEMBER0000000000000001"),
  inventoryLotRef: id("01J0LOT00000000000000000001"),
  prescriptionRef: id("01J0PRESC000000000000000001"),
  quantityG: grams(2.5),
  dispensedBy: id("01J0USER000000000000000001"),
  approvedBy: id("01J0USER000000000000000002"),
});

const makeEvent = (
  override: Partial<Dispensation.DispensationRecorded["payload"]> = {},
  occurredAt: Date = new Date("2026-06-09T10:00:00.000Z"),
): Dispensation.DispensationRecorded => {
  const payload = { ...basePayload(), ...override };
  return event(
    "DispensationRecorded",
    `association:${payload.associationId}:dispensations`,
    occurredAt,
    payload,
  ) as DomainEvent<"DispensationRecorded", typeof payload>;
};

const ctx: SngpcSubmissionContext = {
  associationCNPJ: "12.345.678/0001-99",
  dispensingEntityCode: "ENT-456",
};

// ---------------------------------------------------------------------------
// escapeXml
// ---------------------------------------------------------------------------

describe("escapeXml", () => {
  it("escapes all five XML special characters", () => {
    expect(escapeXml(`& < > " '`)).toBe(`&amp; &lt; &gt; &quot; &apos;`);
  });

  it("escapes ampersand before less-than to avoid double-escaping", () => {
    expect(escapeXml("a&b")).toBe("a&amp;b");
  });

  it("leaves strings with no special characters unchanged", () => {
    const safe = "Hello World 123 CNPJ=00.000.000/0001-00";
    expect(escapeXml(safe)).toBe(safe);
  });

  it("handles an empty string", () => {
    expect(escapeXml("")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// buildDispensationSngpcXml — structure
// ---------------------------------------------------------------------------

describe("buildDispensationSngpcXml — XML declaration and root", () => {
  it("starts with the XML declaration", () => {
    const xml = buildDispensationSngpcXml(makeEvent(), ctx);
    expect(xml.startsWith(`<?xml version="1.0" encoding="UTF-8"?>`)).toBe(true);
  });

  it("wraps output in <dispensation> root element", () => {
    const xml = buildDispensationSngpcXml(makeEvent(), ctx);
    expect(xml).toContain("<dispensation");
    expect(xml).toContain("</dispensation>");
  });

  it("declares the ANVISA SNGPC namespace on the root element", () => {
    const xml = buildDispensationSngpcXml(makeEvent(), ctx);
    expect(xml).toContain(`xmlns="http://www.anvisa.gov.br/sngpc/v1"`);
  });

  it("declares schemaVersion on the root element", () => {
    const xml = buildDispensationSngpcXml(makeEvent(), ctx);
    expect(xml).toContain(`schemaVersion="1.0-placeholder"`);
  });
});

// ---------------------------------------------------------------------------
// buildDispensationSngpcXml — mandatory header fields
// ---------------------------------------------------------------------------

describe("buildDispensationSngpcXml — header mandatory fields", () => {
  it("emits <cnpj> with the association CNPJ from context", () => {
    const xml = buildDispensationSngpcXml(makeEvent(), ctx);
    expect(xml).toContain(`<cnpj>${ctx.associationCNPJ}</cnpj>`);
  });

  it("emits <dispensingEntityCode> from context", () => {
    const xml = buildDispensationSngpcXml(makeEvent(), ctx);
    expect(xml).toContain(
      `<dispensingEntityCode>${ctx.dispensingEntityCode}</dispensingEntityCode>`,
    );
  });

  it("emits <occurredAt> as a UTC ISO-8601 timestamp", () => {
    const xml = buildDispensationSngpcXml(makeEvent(), ctx);
    expect(xml).toContain("<occurredAt>2026-06-09T10:00:00.000Z</occurredAt>");
  });
});

// ---------------------------------------------------------------------------
// buildDispensationSngpcXml — mandatory body fields
// ---------------------------------------------------------------------------

describe("buildDispensationSngpcXml — body mandatory fields", () => {
  it("emits <dispensationId>", () => {
    const xml = buildDispensationSngpcXml(makeEvent(), ctx);
    expect(xml).toContain(
      "<dispensationId>01J0DSP0000000000000000001</dispensationId>",
    );
  });

  it("emits <associationRef>", () => {
    const xml = buildDispensationSngpcXml(makeEvent(), ctx);
    expect(xml).toContain(
      "<associationRef>01J0ASSOC00000000000000001</associationRef>",
    );
  });

  it("emits <memberRef>", () => {
    const xml = buildDispensationSngpcXml(makeEvent(), ctx);
    expect(xml).toContain(
      "<memberRef>01J0MEMBER0000000000000001</memberRef>",
    );
  });

  it("emits <inventoryLotRef>", () => {
    const xml = buildDispensationSngpcXml(makeEvent(), ctx);
    expect(xml).toContain(
      "<inventoryLotRef>01J0LOT00000000000000000001</inventoryLotRef>",
    );
  });

  it("emits <prescriptionRef>", () => {
    const xml = buildDispensationSngpcXml(makeEvent(), ctx);
    expect(xml).toContain(
      "<prescriptionRef>01J0PRESC000000000000000001</prescriptionRef>",
    );
  });

  it("emits <quantityG> as a number string (no units)", () => {
    const xml = buildDispensationSngpcXml(makeEvent(), ctx);
    expect(xml).toContain("<quantityG>2.5</quantityG>");
  });

  it("emits <dispensedBy>", () => {
    const xml = buildDispensationSngpcXml(makeEvent(), ctx);
    expect(xml).toContain(
      "<dispensedBy>01J0USER000000000000000001</dispensedBy>",
    );
  });
});

// ---------------------------------------------------------------------------
// buildDispensationSngpcXml — optional field: approvedBy
// ---------------------------------------------------------------------------

describe("buildDispensationSngpcXml — optional <approvedBy>", () => {
  it("includes <approvedBy> when provided", () => {
    const xml = buildDispensationSngpcXml(makeEvent(), ctx);
    expect(xml).toContain(
      "<approvedBy>01J0USER000000000000000002</approvedBy>",
    );
  });

  it("omits <approvedBy> entirely when null — no empty tag", () => {
    const xml = buildDispensationSngpcXml(makeEvent({ approvedBy: null }), ctx);
    expect(xml).not.toContain("<approvedBy>");
    expect(xml).not.toContain("</approvedBy>");
  });
});

// ---------------------------------------------------------------------------
// buildDispensationSngpcXml — escaping in payload
// ---------------------------------------------------------------------------

describe("buildDispensationSngpcXml — XML escaping in payload fields", () => {
  it("escapes XML-special characters in context CNPJ", () => {
    const xml = buildDispensationSngpcXml(makeEvent(), {
      associationCNPJ: `A&B<C>D"E'F`,
      dispensingEntityCode: "ENT-1",
    });
    expect(xml).toContain(
      "<cnpj>A&amp;B&lt;C&gt;D&quot;E&apos;F</cnpj>",
    );
    // Raw unescaped ampersand must not appear inside a tag value
    expect(xml).not.toContain("<cnpj>A&B");
  });

  it("escapes XML-special characters in dispensingEntityCode", () => {
    const xml = buildDispensationSngpcXml(makeEvent(), {
      ...ctx,
      dispensingEntityCode: `ENT-<"test">`,
    });
    expect(xml).toContain(
      `<dispensingEntityCode>ENT-&lt;&quot;test&quot;&gt;</dispensingEntityCode>`,
    );
  });
});

// ---------------------------------------------------------------------------
// buildDispensationSngpcXml — different quantity values
// ---------------------------------------------------------------------------

describe("buildDispensationSngpcXml — quantity variations", () => {
  it("renders integer grams correctly", () => {
    const xml = buildDispensationSngpcXml(makeEvent({ quantityG: grams(10) }), ctx);
    expect(xml).toContain("<quantityG>10</quantityG>");
  });

  it("renders fractional grams correctly", () => {
    const xml = buildDispensationSngpcXml(makeEvent({ quantityG: grams(0.5) }), ctx);
    expect(xml).toContain("<quantityG>0.5</quantityG>");
  });
});
