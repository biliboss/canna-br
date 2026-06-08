import type { DomainError, DomainEvent, Result } from "@canna/shared";

export type CommandResult<TEvent extends DomainEvent<string, unknown>> =
  Result<
    DomainError,
    {
      readonly events: readonly TEvent[];
      readonly nextVersion: bigint;
    }
  >;
