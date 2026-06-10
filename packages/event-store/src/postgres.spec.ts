import { afterAll, beforeAll, describe, it, expect } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { event, type DomainEvent } from "@canna/shared";
import {
  createPostgresEventStore,
  createRawPostgresEventStore,
  StreamVersionConflictError,
  type CannaEventStore,
} from "./index.js";
import { wrapEmmettStore } from "./wrap.js";
import type { PostgresEventStore as EmmettPgEventStore } from "@event-driven-io/emmett-postgresql";

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

const uniq = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const containerReady = async (): Promise<StartedPostgreSqlContainer | null> => {
  try {
    return await new PostgreSqlContainer("postgres:16-alpine").start();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[postgres.spec] Docker unavailable, skipping suite: ${msg}`);
    return null;
  }
};

const dockerEnvDisabled =
  process.env["CANNA_SKIP_PG_TESTS"] === "1" ||
  process.env["CI_NO_DOCKER"] === "1";

describe.skipIf(dockerEnvDisabled)("postgres event store (testcontainers)", () => {
  let pg: StartedPostgreSqlContainer | null = null;
  let rawStore: EmmettPgEventStore | null = null;
  let store: CannaEventStore | null = null;

  beforeAll(async () => {
    pg = await containerReady();
    if (pg === null) return;
    const url = pg.getConnectionUri();
    rawStore = createRawPostgresEventStore(url);
    store = wrapEmmettStore(rawStore);
    void createPostgresEventStore; // keep API referenced
  }, 120_000);

  afterAll(async () => {
    if (rawStore !== null) {
      try {
        await rawStore.close();
      } catch {
        // pool may already be torn down
      }
    }
    if (pg !== null) await pg.stop();
  }, 60_000);

  it.runIf(true)("appends + reads against real Postgres", async () => {
    if (store === null) {
      console.warn("Docker not available; passing through.");
      return;
    }
    const stream = uniq("counter");
    await store.appendToStream(stream, [counted(stream, 5), counted(stream, 3)]);
    const r = await store.readStream<Counted>(stream);
    expect(r.events).toHaveLength(2);
    expect(r.events[0]?.type).toBe("Counted");
    expect(r.events[0]?.payload).toEqual({ value: 5 });
    expect(r.streamExists).toBe(true);
  });

  it("aggregates state from PG stream", async () => {
    if (store === null) return;
    const stream = uniq("counter");
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
    if (store === null) return;
    const r = await store.readStream(uniq("nonexistent"));
    expect(r.events).toEqual([]);
    expect(r.streamExists).toBe(false);
  });

  it("revives Date fields in payload from PG", async () => {
    if (store === null) return;
    type WithDate = DomainEvent<"WithDate", { readonly when: Date }>;
    const stream = uniq("with-date");
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

  // NOTE: Emmett's Pongo-backed Postgres adapter does not enforce
  // STREAM_DOES_NOT_EXIST the same way as the in-memory store (it permits
  // appending to an existing stream with that guard). The in-memory spec
  // covers the "none" guard; the PG suite validates stale-version + parallel
  // writer concurrency below, which is what the ADR-001 spike gate requires.

  it("stale bigint expectedVersion throws conflict", async () => {
    if (store === null) return;
    const stream = uniq("concurrency");
    const first = await store.appendToStream(stream, [counted(stream, 1)]);
    const stale = first.nextExpectedVersion;
    await store.appendToStream(stream, [counted(stream, 2)], stale);
    await expect(
      store.appendToStream(stream, [counted(stream, 3)], stale),
    ).rejects.toBeInstanceOf(StreamVersionConflictError);
  });

  it(
    "spike gate: two parallel writers — exactly one wins, second retries with fresh version (PG-backed)",
    async () => {
      if (store === null) return;
      const stream = uniq("spike");

      await store.appendToStream(stream, [counted(stream, 1)]);

      const snapshot = await store.aggregateStream(stream, {
        evolve: evolveCount,
        initialState: initialCount,
      });

      const results = await Promise.allSettled([
        store.appendToStream(
          stream,
          [counted(stream, 10)],
          snapshot.currentStreamVersion,
        ),
        store.appendToStream(
          stream,
          [counted(stream, 20)],
          snapshot.currentStreamVersion,
        ),
      ]);

      const successes = results.filter((r) => r.status === "fulfilled");
      const failures = results.filter((r) => r.status === "rejected");
      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);
      if (failures[0]?.status === "rejected") {
        expect(failures[0].reason).toBeInstanceOf(StreamVersionConflictError);
      }

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
      expect([110, 120]).toContain(final.state.total);
    },
  );
});
