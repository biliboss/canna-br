import type { DomainEvent } from "@canna/shared";

/**
 * Global event enumeration — the missing half of the read-model loop.
 *
 * The {@link CannaEventStore} interface is intentionally thin and only exposes
 * per-stream reads (`readStream(streamId)`). A full-replay projection worker
 * needs to enumerate EVERY event across EVERY stream in emission order so it
 * can fold the whole log into the Postgres read-model tables.
 *
 * Emmett's Postgres adapter stores all messages in the `emt_messages` table
 * (one partition per "tenant"; the default partition tag is
 * `emt:default`). This reader mirrors Emmett's own `readMessagesBatch` query
 * (see `@event-driven-io/emmett-postgresql`): it selects committed,
 * non-archived rows from the default partition ordered by
 * `(transaction_id, global_position)` and maps each row back to a
 * {@link DomainEvent}.
 *
 * Mapping (mirror of `wrap.ts` `toEmmett` / `fromEmmett`):
 *   - `message_type`                         -> `type`
 *   - `message_metadata.cannaVersion`        -> `version`
 *   - `message_metadata.cannaStreamId`       -> `streamId`
 *   - `message_metadata.occurredAt` (ISO)    -> `occurredAt` (Date)
 *   - `message_data`                         -> `payload`
 *
 * Date revival inside `payload` is intentionally NOT applied here: the
 * read-model projector consumes string/number scalars, and the only Date the
 * projections need (`occurredAt`) is reconstructed from metadata above. (If a
 * projection later needs a nested payload Date, lift `reviveDates` from
 * `wrap.ts` into shared and apply it here.)
 */

/** Minimal pg client surface this reader needs (node-postgres Pool/Client). */
export interface SqlQueryable {
  query<R extends Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ readonly rows: R[] }>;
}

interface EmtMessageRow extends Record<string, unknown> {
  readonly message_type: string;
  readonly message_data: unknown;
  readonly message_metadata: {
    readonly cannaVersion?: number;
    readonly cannaStreamId?: string;
    readonly occurredAt?: string;
  } | null;
  readonly stream_id: string;
  readonly global_position: string;
}

/** Emmett's default partition tag (see emmett-postgresql `defaultTag`). */
const DEFAULT_PARTITION = "emt:default";

/**
 * Read every committed event across all streams, ordered for replay.
 *
 * Pass a node-postgres `Pool` or `Client` (or anything matching
 * {@link SqlQueryable}). Safe to call repeatedly — it is a pure read.
 */
export const readAllEvents = async (
  db: SqlQueryable,
  options?: { readonly partition?: string },
): Promise<readonly DomainEvent<string, unknown>[]> => {
  const partition = options?.partition ?? DEFAULT_PARTITION;
  const result = await db.query<EmtMessageRow>(
    `SELECT stream_id, global_position, message_data, message_metadata, message_type
       FROM emt_messages
       WHERE partition = $1
         AND is_archived = FALSE
         AND transaction_id < pg_snapshot_xmin(pg_current_snapshot())
       ORDER BY transaction_id, global_position`,
    [partition],
  );

  return result.rows.map((row) => {
    const meta = row.message_metadata ?? {};
    const occurredAtIso = meta.occurredAt;
    return {
      type: row.message_type,
      version: (meta.cannaVersion ?? 1) as 1,
      streamId: meta.cannaStreamId ?? row.stream_id,
      occurredAt:
        typeof occurredAtIso === "string"
          ? new Date(occurredAtIso)
          : new Date(0),
      payload: (row.message_data ?? {}) as unknown,
    } satisfies DomainEvent<string, unknown>;
  });
};

/**
 * Production factory: open a node-postgres pool against `connectionString`
 * (the SAME `DATABASE_URL` the Emmett event store writes to) and return a
 * bound global reader plus a disposer.
 *
 * Lazily imports `pg` so the lighter test path (pglite / in-memory) doesn't
 * need the native driver loaded — mirrors the read-model package's factories.
 */
export const createPostgresEventReader = async (
  connectionString: string,
): Promise<{
  readAllEvents(): Promise<readonly DomainEvent<string, unknown>[]>;
  close(): Promise<void>;
}> => {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString });
  return {
    readAllEvents: () => readAllEvents(pool as unknown as SqlQueryable),
    close: () => pool.end(),
  };
};
