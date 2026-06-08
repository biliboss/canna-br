import { getPostgreSQLEventStore } from "@event-driven-io/emmett-postgresql";
import type { CannaEventStore } from "./types.js";
import { wrapEmmettStore } from "./wrap.js";

export interface PostgresEventStoreOptions {
  /**
   * Connection string. Example:
   *   postgres://user:pass@host:5432/database
   */
  readonly connectionString: string;
}

/**
 * Create a CannaEventStore backed by Emmett's Postgres adapter. The Emmett
 * adapter manages schema migrations on first append (via Pongo).
 *
 * For tests, pair this with `testcontainers` to spin a real Postgres instance.
 */
export const createPostgresEventStore = (
  options: PostgresEventStoreOptions,
): CannaEventStore =>
  wrapEmmettStore(getPostgreSQLEventStore(options.connectionString));

/**
 * Re-exported here so call sites can close the underlying Emmett event store
 * (it implements `Closeable`). The CannaEventStore interface is intentionally
 * thin and does not expose lifecycle — apps decide when to dispose the PG
 * connection pool.
 */
export const createRawPostgresEventStore = (
  connectionString: string,
) => getPostgreSQLEventStore(connectionString);
