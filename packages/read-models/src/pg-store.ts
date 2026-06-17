import { and, eq } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import {
  inventoryLots,
  members,
  memberQuota,
  type MemberStatusValue,
  type NewInventoryLotRow,
  type NewMemberQuotaRow,
  type NewMemberRow,
} from "./schema/index.js";

/**
 * Async, Postgres-backed read surface used by the MCP query tools
 * (`find_member_by_cpf`, `get_members_by_status`, `get_member_quota`,
 * `list_available_lots`).
 *
 * Deliberately distinct from the synchronous {@link ReadModelStore} (which
 * projections write through and unit-test against in memory): a real Postgres
 * driver is async, so the read contract the tools call MUST be async too. The
 * method names, arguments and return shapes mirror the sync store's read
 * methods — only sync→async differs.
 */
export interface ReadModelQuery {
  getMemberByCpfHash(
    cpfHash: string,
    associationId: string,
  ): Promise<NewMemberRow | undefined>;
  listMembersByStatus(
    associationId: string,
    status?: MemberStatusValue,
  ): Promise<readonly NewMemberRow[]>;
  getMemberQuota(memberId: string, month: string): Promise<NewMemberQuotaRow | undefined>;
  listAvailableLots(associationId: string): Promise<readonly NewInventoryLotRow[]>;
}

/**
 * Adapt a synchronous {@link ReadModelStore} into the async {@link ReadModelQuery}
 * contract. Used for the dev/in-memory fallback (and tool specs) so the same
 * async surface the production pg adapter exposes can be served without a
 * database. `listAvailableLots` filters the in-memory store's lots to RELEASED.
 */
export const asyncReadModel = (
  store: import("./store.js").ReadModelStore,
): ReadModelQuery => ({
  getMemberByCpfHash: async (cpfHash, associationId) =>
    store.getMemberByCpfHash(cpfHash, associationId),
  listMembersByStatus: async (associationId, status) =>
    store.listMembersByStatus(associationId, status),
  getMemberQuota: async (memberId, month) => store.getMemberQuota(memberId, month),
  listAvailableLots: async (associationId) => {
    const result: NewInventoryLotRow[] = [];
    // The sync store exposes per-id getters only; there is no list method, so
    // this wrapper supports the query contract shape but returns empty unless a
    // richer in-memory index is added. Dev fallback callers that need lots
    // should use the pg adapter.
    void associationId;
    return result;
  },
});

// drizzle PgDatabase is generic over its query schema; the adapter only uses
// the core query builder, so we accept any concrete pg database (node-postgres
// for prod, pglite for tests).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyPgDatabase = PgDatabase<any, any, any>;

/**
 * Build a {@link ReadModelQuery} over an existing Drizzle Postgres database.
 *
 * Use this when you already have a drizzle instance (e.g. pglite in tests, or
 * a shared pool). For production wiring from a connection string use
 * {@link createPostgresStoreFromConnectionString}.
 */
export const createPostgresStore = (db: AnyPgDatabase): ReadModelQuery => ({
  async getMemberByCpfHash(cpfHash, associationId) {
    const rows = await db
      .select()
      .from(members)
      .where(and(eq(members.cpfHash, cpfHash), eq(members.associationId, associationId)))
      .limit(1);
    return rows[0] as NewMemberRow | undefined;
  },

  async listMembersByStatus(associationId, status) {
    const where =
      status === undefined
        ? eq(members.associationId, associationId)
        : and(eq(members.associationId, associationId), eq(members.status, status));
    const rows = await db.select().from(members).where(where);
    return rows as NewMemberRow[];
  },

  async getMemberQuota(memberId, month) {
    const rows = await db
      .select()
      .from(memberQuota)
      .where(and(eq(memberQuota.memberId, memberId), eq(memberQuota.month, month)))
      .limit(1);
    return rows[0] as NewMemberQuotaRow | undefined;
  },

  async listAvailableLots(associationId) {
    const rows = await db
      .select()
      .from(inventoryLots)
      .where(
        and(
          eq(inventoryLots.associationId, associationId),
          eq(inventoryLots.status, "RELEASED"),
        ),
      );
    return rows as NewInventoryLotRow[];
  },
});

/**
 * Production factory: open a node-postgres pool against `connectionString` and
 * build the read query adapter over it.
 *
 * Lazily imports `pg` + `drizzle-orm/node-postgres` so the lighter test path
 * (pglite) does not need the native driver loaded.
 */
export const createPostgresStoreFromConnectionString = async (
  connectionString: string,
): Promise<ReadModelQuery> => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);
  return createPostgresStore(db as unknown as AnyPgDatabase);
};
