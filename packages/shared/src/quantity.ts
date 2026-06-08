import type { Result } from "./result.js";
import { ok, err } from "./result.js";
import type { DomainError } from "./errors.js";
import { domainError } from "./errors.js";

export type QuantityGrams = number & { readonly __brand: "QuantityGrams" };

const GRAM_SCALE = 100;

const round = (n: number): number => Math.round(n * GRAM_SCALE) / GRAM_SCALE;

export const quantityGrams = (
  value: number,
): Result<DomainError, QuantityGrams> => {
  if (!Number.isFinite(value)) {
    return err(
      domainError("QUANTITY_NOT_FINITE", "Quantity must be a finite number"),
    );
  }
  if (value < 0) {
    return err(
      domainError(
        "QUANTITY_NEGATIVE",
        "Quantity must be non-negative",
        { value },
      ),
    );
  }
  return ok(round(value) as QuantityGrams);
};

export const addGrams = (a: QuantityGrams, b: QuantityGrams): QuantityGrams =>
  round((a as number) + (b as number)) as QuantityGrams;

export const subtractGrams = (
  a: QuantityGrams,
  b: QuantityGrams,
): Result<DomainError, QuantityGrams> => {
  const v = round((a as number) - (b as number));
  if (v < 0) {
    return err(
      domainError(
        "QUANTITY_UNDERFLOW",
        "Subtraction would produce negative quantity",
        { a: a as number, b: b as number, result: v },
      ),
    );
  }
  return ok(v as QuantityGrams);
};

export const gramsToNumber = (q: QuantityGrams): number => q as number;
