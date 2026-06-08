import type { DomainEvent } from "@canna/shared";

/**
 * Expected stream version for optimistic concurrency.
 * - `"none"`: stream must not exist (first append).
 * - `bigint`: append succeeds only if current version equals this.
 * - omitted: no concurrency check.
 */
export type ExpectedVersion = bigint | "none";

export interface AppendResult {
  readonly nextExpectedVersion: bigint;
}

export interface ReadStreamResult<TEvent> {
  readonly events: readonly TEvent[];
  readonly currentStreamVersion: bigint;
  readonly streamExists: boolean;
}

export interface AggregateResult<TState> {
  readonly state: TState;
  readonly currentStreamVersion: bigint;
  readonly streamExists: boolean;
}

export interface CannaEventStore {
  appendToStream<TEvent extends DomainEvent<string, unknown>>(
    streamId: string,
    events: readonly TEvent[],
    expectedVersion?: ExpectedVersion,
  ): Promise<AppendResult>;

  readStream<TEvent extends DomainEvent<string, unknown>>(
    streamId: string,
  ): Promise<ReadStreamResult<TEvent>>;

  aggregateStream<TState, TEvent extends DomainEvent<string, unknown>>(
    streamId: string,
    options: {
      evolve: (state: TState, event: TEvent) => TState;
      initialState: () => TState;
    },
  ): Promise<AggregateResult<TState>>;
}

export class StreamVersionConflictError extends Error {
  constructor(
    public readonly streamId: string,
    public readonly expected: ExpectedVersion,
    public readonly actual: bigint,
  ) {
    super(
      `Stream version conflict on ${streamId}: expected ${String(expected)}, actual ${String(actual)}`,
    );
    this.name = "StreamVersionConflictError";
  }
}
