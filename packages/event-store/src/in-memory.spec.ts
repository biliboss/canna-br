import { describe, it, expect } from "vitest";
import { event, type DomainEvent } from "@canna/shared";
import {
  createInMemoryEventStore,
  StreamVersionConflictError,
} from "./index.js";

type Counted = DomainEvent<"Counted", { readonly value: number }>;

const counted = (streamId: string, value: number, at = new Date()): Counted =>
  event("Counted", streamId, at, { value });

const evolveCount = (
  state: { readonly total: number },
  e: Counted,
): { readonly total: number } => ({
  total: state.total + e.payload.value,
});

const initialCount = () => ({ total: 0 });

describe("in-memory event store", () => {
  it("appends + reads events back", async () => {
    const store = createInMemoryEventStore();
    const stream = "counter:001";
    await store.appendToStream(stream, [counted(stream, 5), counted(stream, 3)]);
    const result = await store.readStream<Counted>(stream);
    expect(result.events).toHaveLength(2);
    expect(result.events[0]?.type).toBe("Counted");
    expect(result.events[0]?.payload).toEqual({ value: 5 });
    expect(result.events[0]?.streamId).toBe(stream);
    expect(result.streamExists).toBe(true);
  });

  it("aggregates state from stream", async () => {
    const store = createInMemoryEventStore();
    const stream = "counter:002";
    await store.appendToStream(stream, [
      counted(stream, 10),
      counted(stream, 7),
      counted(stream, 3),
    ]);
    const agg = await store.aggregateStream(stream, {
      evolve: evolveCount,
      initialState: initialCount,
    });
    expect(agg.state).toEqual({ total: 20 });
    expect(agg.streamExists).toBe(true);
  });

  it("readStream on non-existent stream returns empty + streamExists=false", async () => {
    const store = createInMemoryEventStore();
    const result = await store.readStream("nonexistent:000");
    expect(result.events).toEqual([]);
    expect(result.streamExists).toBe(false);
  });

  it("revives Date fields in payload", async () => {
    type WithDate = DomainEvent<"WithDate", { readonly when: Date }>;
    const store = createInMemoryEventStore();
    const stream = "with-date:001";
    const at = new Date("2026-06-08T12:00:00Z");
    const inner = new Date("2026-12-01T00:00:00Z");
    await store.appendToStream<WithDate>(stream, [
      event("WithDate", stream, at, { when: inner }),
    ]);
    const r = await store.readStream<WithDate>(stream);
    expect(r.events[0]?.payload.when).toBeInstanceOf(Date);
    expect((r.events[0]?.payload.when as Date).toISOString()).toBe(
      inner.toISOString(),
    );
    expect(r.events[0]?.occurredAt.toISOString()).toBe(at.toISOString());
  });

  it("appendToStream with expectedVersion='none' succeeds on first append", async () => {
    const store = createInMemoryEventStore();
    const stream = "guard:001";
    const r = await store.appendToStream(stream, [counted(stream, 1)], "none");
    expect(r.nextExpectedVersion).toBeDefined();
  });

  it("appendToStream with expectedVersion='none' throws on existing stream", async () => {
    const store = createInMemoryEventStore();
    const stream = "guard:002";
    await store.appendToStream(stream, [counted(stream, 1)]);
    await expect(
      store.appendToStream(stream, [counted(stream, 2)], "none"),
    ).rejects.toBeInstanceOf(StreamVersionConflictError);
  });

  it("appendToStream with stale bigint expectedVersion throws conflict", async () => {
    const store = createInMemoryEventStore();
    const stream = "concurrency:001";
    const first = await store.appendToStream(stream, [counted(stream, 1)]);

    // Both "writers" read version=first.nextExpectedVersion
    const expected = first.nextExpectedVersion;

    // Writer A wins
    await store.appendToStream(stream, [counted(stream, 2)], expected);

    // Writer B retries with the stale expected version — should conflict
    await expect(
      store.appendToStream(stream, [counted(stream, 3)], expected),
    ).rejects.toBeInstanceOf(StreamVersionConflictError);
  });

  it("optimistic concurrency: two parallel writers — only one wins, second retries with fresh version", async () => {
    const store = createInMemoryEventStore();
    const stream = "concurrency:002";

    // Seed
    await store.appendToStream(stream, [counted(stream, 1)]);

    // Both read the same version
    const snapshot = await store.aggregateStream(stream, {
      evolve: evolveCount,
      initialState: initialCount,
    });
    const versionAtSnapshot = snapshot.currentStreamVersion;

    // Parallel: each tries to append with the same expected version
    const results = await Promise.allSettled([
      store.appendToStream(stream, [counted(stream, 10)], versionAtSnapshot),
      store.appendToStream(stream, [counted(stream, 20)], versionAtSnapshot),
    ]);

    const successes = results.filter((r) => r.status === "fulfilled");
    const failures = results.filter((r) => r.status === "rejected");

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    if (failures[0]?.status === "rejected") {
      expect(failures[0].reason).toBeInstanceOf(StreamVersionConflictError);
    }

    // Loser retries: read fresh version, succeed
    const fresh = await store.aggregateStream(stream, {
      evolve: evolveCount,
      initialState: initialCount,
    });
    await store.appendToStream(
      stream,
      [counted(stream, 99)],
      fresh.currentStreamVersion,
    );

    const final = await store.aggregateStream(stream, {
      evolve: evolveCount,
      initialState: initialCount,
    });
    // 1 + (10 or 20) + 99
    expect([110, 120]).toContain(final.state.total);
  });
});
