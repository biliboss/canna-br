import type { DomainError, DomainEvent, Result } from "@canna/shared";

export type CommandResult<TEvent extends DomainEvent<string, unknown>> =
  Result<
    DomainError,
    {
      readonly events: readonly TEvent[];
      readonly nextVersion: bigint;
    }
  >;

/**
 * Read-side query envelope — same `Result<DomainError, T>` shape as
 * {@link CommandResult} so callers unwrap reads and writes symmetrically.
 */
export type QueryResult<T> = Result<DomainError, T>;

/**
 * Expected-version policy for optimistic-concurrency appends. A brand-new
 * stream (no events yet) is in the `EMPTY` status and must be appended with
 * `"none"`; any other status appends at the loaded `version`. Centralised here
 * so the `status === "EMPTY"` rule lives in exactly one place instead of being
 * a magic string repeated across services.
 */
export const expectedVersionFor = (
  status: string,
  version: bigint,
): bigint | "none" => (status === "EMPTY" ? "none" : version);
