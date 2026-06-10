const DOMAIN_ERROR_BRAND = Symbol("DomainError");

export interface DomainError {
  readonly [DOMAIN_ERROR_BRAND]: true;
  readonly code: string;
  readonly message: string;
  readonly context?: Readonly<Record<string, unknown>>;
}

export const domainError = (
  code: string,
  message: string,
  context?: Record<string, unknown>,
): DomainError => ({
  [DOMAIN_ERROR_BRAND]: true,
  code,
  message,
  ...(context !== undefined ? { context } : {}),
});

export const isDomainError = (x: unknown): x is DomainError =>
  typeof x === "object" && x !== null && DOMAIN_ERROR_BRAND in x;
