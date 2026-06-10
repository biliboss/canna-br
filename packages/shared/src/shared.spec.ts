import { describe, it, expect } from "vitest";
import {
  ok,
  err,
  isOk,
  isErr,
  domainError,
  isDomainError,
  fixedClock,
  fixedIdGenerator,
  quantityGrams,
  addGrams,
  subtractGrams,
  gramsToNumber,
} from "./index.js";

describe("Result", () => {
  it("ok wraps a value", () => {
    const r = ok(42);
    expect(isOk(r)).toBe(true);
    expect(isErr(r)).toBe(false);
    if (isOk(r)) expect(r.value).toBe(42);
  });

  it("err wraps an error", () => {
    const r = err("nope");
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error).toBe("nope");
  });
});

describe("domainError", () => {
  it("creates branded errors", () => {
    const e = domainError("CODE", "message");
    expect(isDomainError(e)).toBe(true);
    expect(e.code).toBe("CODE");
    expect(e.message).toBe("message");
  });

  it("accepts context", () => {
    const e = domainError("CODE", "msg", { x: 1 });
    expect(e.context).toEqual({ x: 1 });
  });

  it("rejects non-error objects", () => {
    expect(isDomainError({})).toBe(false);
    expect(isDomainError(null)).toBe(false);
  });
});

describe("fixedClock", () => {
  it("returns initial date", () => {
    const c = fixedClock(new Date("2026-06-08T00:00:00Z"));
    expect(c.now().toISOString()).toBe("2026-06-08T00:00:00.000Z");
  });

  it("ticks forward", () => {
    const c = fixedClock(new Date("2026-06-08T00:00:00Z"));
    c.tick(1000);
    expect(c.now().toISOString()).toBe("2026-06-08T00:00:01.000Z");
  });
});

describe("fixedIdGenerator", () => {
  it("returns sequence in order", () => {
    const g = fixedIdGenerator(["A", "B", "C"]);
    expect(g.generate()).toBe("A");
    expect(g.generate()).toBe("B");
    expect(g.generate()).toBe("C");
  });

  it("throws when exhausted", () => {
    const g = fixedIdGenerator(["A"]);
    g.generate();
    expect(() => g.generate()).toThrow(/exhausted/);
  });
});

describe("quantityGrams", () => {
  it("accepts non-negative", () => {
    const r = quantityGrams(10);
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(gramsToNumber(r.value)).toBe(10);
  });

  it("rejects negative", () => {
    const r = quantityGrams(-1);
    expect(isErr(r)).toBe(true);
    if (isErr(r)) expect(r.error.code).toBe("QUANTITY_NEGATIVE");
  });

  it("rejects non-finite", () => {
    const r = quantityGrams(Number.POSITIVE_INFINITY);
    expect(isErr(r)).toBe(true);
  });

  it("rounds to 2 decimal places", () => {
    const r = quantityGrams(1.234);
    if (isOk(r)) expect(gramsToNumber(r.value)).toBe(1.23);
  });
});

describe("addGrams / subtractGrams", () => {
  it("adds two quantities", () => {
    const a = quantityGrams(10);
    const b = quantityGrams(5);
    if (isOk(a) && isOk(b)) {
      const sum = addGrams(a.value, b.value);
      expect(gramsToNumber(sum)).toBe(15);
    }
  });

  it("subtracts when result non-negative", () => {
    const a = quantityGrams(10);
    const b = quantityGrams(3);
    if (isOk(a) && isOk(b)) {
      const r = subtractGrams(a.value, b.value);
      if (isOk(r)) expect(gramsToNumber(r.value)).toBe(7);
    }
  });

  it("rejects underflow", () => {
    const a = quantityGrams(5);
    const b = quantityGrams(10);
    if (isOk(a) && isOk(b)) {
      const r = subtractGrams(a.value, b.value);
      expect(isErr(r)).toBe(true);
      if (isErr(r)) expect(r.error.code).toBe("QUANTITY_UNDERFLOW");
    }
  });
});
