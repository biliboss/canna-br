import {
  getInMemoryEventStore,
  isExpectedVersionConflictError,
  type Event as EmmettEvent,
} from "@event-driven-io/emmett";
import type { DomainEvent } from "@canna/shared";
import type {
  AggregateResult,
  AppendResult,
  CannaEventStore,
  ExpectedVersion,
  ReadStreamResult,
} from "./types.js";
import { StreamVersionConflictError } from "./types.js";

interface CannaEmmettMetadata extends Record<string, unknown> {
  readonly cannaVersion: number;
  readonly cannaStreamId: string;
  readonly occurredAt: string;
}

type StoredEvent = EmmettEvent<string, Record<string, unknown>, CannaEmmettMetadata>;

const toEmmett = <T extends DomainEvent<string, unknown>>(
  e: T,
): StoredEvent => ({
  type: e.type,
  data: (e.payload ?? {}) as Record<string, unknown>,
  metadata: {
    cannaVersion: e.version,
    cannaStreamId: e.streamId,
    occurredAt: e.occurredAt.toISOString(),
  },
});

const reviveDate = (v: unknown): unknown => {
  if (typeof v === "string") {
    const m = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.exec(v);
    if (m !== null) return new Date(v);
  }
  return v;
};

const reviveDates = (input: unknown): unknown => {
  if (input instanceof Date) return input;
  if (Array.isArray(input)) return input.map(reviveDates);
  if (input !== null && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (v instanceof Date) {
        out[k] = v;
        continue;
      }
      if (v !== null && typeof v === "object") {
        out[k] = reviveDates(v);
        continue;
      }
      out[k] = reviveDate(v);
    }
    return out;
  }
  return input;
};

const fromEmmett = <T extends DomainEvent<string, unknown>>(
  stored: {
    type: string;
    data: Record<string, unknown>;
    metadata: CannaEmmettMetadata;
  },
): T =>
  ({
    type: stored.type,
    version: stored.metadata.cannaVersion as 1,
    streamId: stored.metadata.cannaStreamId,
    occurredAt: new Date(stored.metadata.occurredAt),
    payload: reviveDates(stored.data),
  }) as unknown as T;

const toEmmettExpected = (
  v: ExpectedVersion | undefined,
): bigint | "STREAM_DOES_NOT_EXIST" | undefined => {
  if (v === undefined) return undefined;
  if (v === "none") return "STREAM_DOES_NOT_EXIST";
  return v;
};

export const createInMemoryEventStore = (): CannaEventStore => {
  const store = getInMemoryEventStore();

  return {
    async appendToStream(streamId, events, expectedVersion): Promise<AppendResult> {
      const stored = events.map(toEmmett);
      try {
        const emmettExpected = toEmmettExpected(expectedVersion);
        const result =
          emmettExpected === undefined
            ? await store.appendToStream(streamId, stored)
            : await store.appendToStream(streamId, stored, {
                expectedStreamVersion: emmettExpected,
              });
        return {
          nextExpectedVersion: result.nextExpectedStreamVersion as bigint,
        };
      } catch (e) {
        if (isExpectedVersionConflictError(e)) {
          throw new StreamVersionConflictError(
            streamId,
            expectedVersion ?? "none",
            -1n,
          );
        }
        throw e;
      }
    },

    async readStream(streamId): Promise<ReadStreamResult<never>> {
      const result = await store.readStream<StoredEvent>(streamId);
      const events = (result.events ?? []).map((e) =>
        fromEmmett({
          type: e.type,
          data: e.data,
          metadata: e.metadata as unknown as CannaEmmettMetadata,
        }),
      );
      return {
        events: events as never[],
        currentStreamVersion: result.currentStreamVersion as bigint,
        streamExists: result.streamExists,
      };
    },

    async aggregateStream(streamId, options): Promise<AggregateResult<never>> {
      const result = await store.aggregateStream<unknown, StoredEvent>(
        streamId,
        {
          evolve: (state: unknown, evt: StoredEvent) => {
            const domainEvt = fromEmmett({
              type: evt.type,
              data: evt.data,
              metadata: evt.metadata as unknown as CannaEmmettMetadata,
            });
            return (options.evolve as (s: unknown, e: unknown) => unknown)(
              state,
              domainEvt,
            );
          },
          initialState: () => options.initialState() as unknown,
        },
      );
      return {
        state: result.state as never,
        currentStreamVersion: result.currentStreamVersion as bigint,
        streamExists: result.streamExists,
      };
    },
  };
};
