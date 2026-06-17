import { createHash } from "node:crypto";
import { inArray, sql } from "drizzle-orm";
import type { DomainEvent } from "@canna/shared";

import { applyEvents } from "./apply.js";
import type { AnyPgDatabase } from "./pg-store.js";
import {
  auditLog,
  dispensations,
  inventoryLots,
  members,
  memberQuota,
  prescriptions,
  type NewAuditLogRow,
  type NewDispensationRow,
  type NewInventoryLotRow,
  type NewMemberQuotaRow,
  type NewMemberRow,
  type NewPrescriptionRow,
} from "./schema/index.js";
import { createInMemoryStore, type ReadModelStore } from "./store.js";

/**
 * The in-memory {@link ReadModelStore} only exposes per-id getters, so a
 * generic flush cannot enumerate it. This drainable variant wraps the canonical
 * in-memory store and additionally records every upserted row per table so the
 * pg flush can replay them as idempotent upserts.
 */
interface DrainableStore extends ReadModelStore {
  drain(): {
    readonly members: NewMemberRow[];
    readonly prescriptions: NewPrescriptionRow[];
    readonly memberQuota: NewMemberQuotaRow[];
    readonly inventoryLots: NewInventoryLotRow[];
    readonly dispensations: NewDispensationRow[];
    readonly auditLog: NewAuditLogRow[];
  };
}

const createDrainableStore = (): DrainableStore => {
  const base = createInMemoryStore();
  const draft = {
    members: new Map<string, NewMemberRow>(),
    prescriptions: new Map<string, NewPrescriptionRow>(),
    memberQuota: new Map<string, NewMemberQuotaRow>(),
    inventoryLots: new Map<string, NewInventoryLotRow>(),
    dispensations: new Map<string, NewDispensationRow>(),
    auditLog: new Map<string, NewAuditLogRow>(),
  };
  return {
    ...base,
    upsertMember(row) {
      base.upsertMember(row);
      draft.members.set(row.memberId, row);
    },
    upsertPrescription(row) {
      base.upsertPrescription(row);
      draft.prescriptions.set(row.prescriptionId, row);
    },
    upsertMemberQuota(row) {
      base.upsertMemberQuota(row);
      draft.memberQuota.set(`${row.memberId}::${row.month}`, row);
    },
    upsertInventoryLot(row) {
      base.upsertInventoryLot(row);
      draft.inventoryLots.set(row.lotId, row);
    },
    upsertDispensation(row) {
      base.upsertDispensation(row);
      draft.dispensations.set(row.dispensationId, row);
    },
    appendAuditLog(row) {
      base.appendAuditLog(row);
      // Keyed by the deterministic id projectAudit already computes, so even
      // within a single batch the same event yields a single audit row.
      draft.auditLog.set(String(row.id), row);
    },
    drain() {
      return {
        members: [...draft.members.values()],
        prescriptions: [...draft.prescriptions.values()],
        memberQuota: [...draft.memberQuota.values()],
        inventoryLots: [...draft.inventoryLots.values()],
        dispensations: [...draft.dispensations.values()],
        auditLog: [...draft.auditLog.values()],
      };
    },
  };
};

/**
 * Deterministic RFC-4122 v5 UUID from the audit-log composite key string.
 *
 * `projectAudit` emits a stable string id (`evt::type::stream::iso::seq`) but
 * the `audit_log.id` column is a real `uuid`. Hashing that string into a v5
 * UUID gives a stable, collision-resistant primary key so `onConflictDoNothing`
 * deduplicates re-applied events at the database level (re-replay = no-op).
 */
const DNS_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

export const deterministicAuditUuid = (key: string): string => {
  const ns = Buffer.from(DNS_NAMESPACE.replace(/-/g, ""), "hex");
  const hash = createHash("sha1")
    .update(ns)
    .update(Buffer.from(key, "utf8"))
    .digest();
  const bytes = hash.subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC 4122 variant
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

/**
 * Apply a sequence of domain events to the Postgres read-model tables.
 *
 * Bridges the sync {@link applyEvents} driver (which only knows the in-memory
 * {@link ReadModelStore}) to async Drizzle/pg writes:
 *   1. Fold the events into a fresh drainable in-memory store.
 *   2. Flush the resulting rows with idempotent upserts.
 *
 * Idempotency contract (proven in `__tests__/pg-projector.spec.ts`):
 *   - Snapshot tables (members/prescriptions/lots/dispensations) upsert by PK.
 *   - `member_quota` SETs the folded total (NOT add) — full replay converges.
 *   - `audit_log` inserts on a deterministic v5 UUID with `onConflictDoNothing`,
 *     so re-applying the same events never duplicates audit rows.
 *
 * NOTE: this is a FULL-REPLAY projector — pass the complete ordered event log
 * for a clean, idempotent rebuild. Incremental/checkpointed application (apply
 * only events after offset N) is a TODO; with a checkpoint the accumulator
 * would need the persisted audit guard rather than fold-from-empty.
 */
export const applyEventsToPg = async (
  db: AnyPgDatabase,
  events: readonly DomainEvent<string, unknown>[],
): Promise<void> => {
  const store = createDrainableStore();
  applyEvents(events, store);
  const rows = store.drain();

  for (const row of rows.members) {
    await db
      .insert(members)
      .values(row)
      .onConflictDoUpdate({ target: members.memberId, set: row });
  }
  for (const row of rows.prescriptions) {
    await db
      .insert(prescriptions)
      .values(row)
      .onConflictDoUpdate({ target: prescriptions.prescriptionId, set: row });
  }
  for (const row of rows.memberQuota) {
    await db
      .insert(memberQuota)
      .values(row)
      .onConflictDoUpdate({
        target: [memberQuota.memberId, memberQuota.month],
        set: { consumedG: row.consumedG },
      });
  }
  for (const row of rows.inventoryLots) {
    await db
      .insert(inventoryLots)
      .values(row)
      .onConflictDoUpdate({ target: inventoryLots.lotId, set: row });
  }
  for (const row of rows.dispensations) {
    await db
      .insert(dispensations)
      .values(row)
      .onConflictDoUpdate({ target: dispensations.dispensationId, set: row });
  }
  // audit_log is guarded by append-only RULEs (no UPDATE/DELETE), which makes
  // Postgres reject any `ON CONFLICT` clause on the table. So we dedupe with a
  // read-then-insert: derive the deterministic v5 id, skip ids already present,
  // and insert only the new rows. Re-applying the same log inserts nothing new.
  if (rows.auditLog.length > 0) {
    const withIds = rows.auditLog.map((row) => ({
      ...row,
      id: deterministicAuditUuid(String(row.id)),
    }));
    const ids = withIds.map((r) => r.id);
    const existing = await db
      .select({ id: auditLog.id })
      .from(auditLog)
      .where(inArray(auditLog.id, ids));
    const present = new Set(existing.map((r) => r.id));
    const fresh = withIds.filter((r) => !present.has(r.id));
    if (fresh.length > 0) {
      await db.insert(auditLog).values(fresh);
    }
  }
  void sql; // keep import for potential future raw-SQL needs
};

/**
 * Production factory: open a node-postgres pool and return a projector bound to
 * it plus a disposer. Lazily imports the native driver (mirrors
 * `createPostgresStoreFromConnectionString`) so the pglite test path stays light.
 */
export const createPgProjectorFromConnectionString = async (
  connectionString: string,
): Promise<{
  applyEventsToPg(events: readonly DomainEvent<string, unknown>[]): Promise<void>;
  close(): Promise<void>;
}> => {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pool = new Pool({ connectionString });
  const db = drizzle(pool) as unknown as AnyPgDatabase;
  return {
    applyEventsToPg: (events) => applyEventsToPg(db, events),
    close: () => pool.end(),
  };
};
