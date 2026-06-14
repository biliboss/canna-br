import type {
  NewAuditLogRow,
  NewDispensationRow,
  NewInventoryLotRow,
  NewMemberQuotaRow,
  NewMemberRow,
  NewPrescriptionRow,
} from "./schema/index.js";

/**
 * Test-friendly read-model store: an in-memory key/value surface mirroring the
 * Drizzle tables that projections write to.
 *
 * Production wiring goes through Drizzle against Postgres — this interface
 * exists so projections can be unit-tested without spinning up a database.
 *
 * Upserts are idempotent: re-applying the same event sequence must produce
 * the same final state.
 */
export interface ReadModelStore {
  upsertMember(row: NewMemberRow): void;
  getMember(memberId: string): NewMemberRow | undefined;
  /**
   * Look up a member by the LGPD-safe cpfHash scoped to an association.
   * Returns undefined when no row matches (member not registered or cpfHash
   * belongs to a different association).
   */
  getMemberByCpfHash(cpfHash: string, associationId: string): NewMemberRow | undefined;

  upsertPrescription(row: NewPrescriptionRow): void;
  getPrescription(prescriptionId: string): NewPrescriptionRow | undefined;

  upsertMemberQuota(row: NewMemberQuotaRow): void;
  getMemberQuota(memberId: string, month: string): NewMemberQuotaRow | undefined;

  upsertInventoryLot(row: NewInventoryLotRow): void;
  getInventoryLot(lotId: string): NewInventoryLotRow | undefined;

  upsertDispensation(row: NewDispensationRow): void;
  getDispensation(dispensationId: string): NewDispensationRow | undefined;

  appendAuditLog(row: NewAuditLogRow): void;
  /** Stable audit-log key used by the in-memory store to keep idempotent. */
  hasAuditLog(key: string): boolean;
  listAuditLog(): readonly NewAuditLogRow[];
}

/**
 * Stable composite key for audit-log idempotency in the in-memory store:
 *
 *   `${eventType}::${streamId}::${occurredAt.toISOString()}::${index}`
 *
 * Two events of the same type on the same stream at the exact same instant
 * are disambiguated by their position in the input array.
 */
export const auditLogKey = (
  eventType: string,
  streamId: string,
  occurredAt: Date,
  index: number,
): string => `${eventType}::${streamId}::${occurredAt.toISOString()}::${index}`;

export const createInMemoryStore = (): ReadModelStore => {
  const members = new Map<string, NewMemberRow>();
  const prescriptions = new Map<string, NewPrescriptionRow>();
  const memberQuota = new Map<string, NewMemberQuotaRow>();
  const inventoryLots = new Map<string, NewInventoryLotRow>();
  const dispensations = new Map<string, NewDispensationRow>();
  const auditLog = new Map<string, NewAuditLogRow>();

  const quotaKey = (memberId: string, month: string): string => `${memberId}::${month}`;

  return {
    upsertMember(row) {
      members.set(row.memberId, row);
    },
    getMember(memberId) {
      return members.get(memberId);
    },
    getMemberByCpfHash(cpfHash, associationId) {
      for (const row of members.values()) {
        if (row.cpfHash === cpfHash && row.associationId === associationId) {
          return row;
        }
      }
      return undefined;
    },

    upsertPrescription(row) {
      prescriptions.set(row.prescriptionId, row);
    },
    getPrescription(prescriptionId) {
      return prescriptions.get(prescriptionId);
    },

    upsertMemberQuota(row) {
      memberQuota.set(quotaKey(row.memberId, row.month), row);
    },
    getMemberQuota(memberId, month) {
      return memberQuota.get(quotaKey(memberId, month));
    },

    upsertInventoryLot(row) {
      inventoryLots.set(row.lotId, row);
    },
    getInventoryLot(lotId) {
      return inventoryLots.get(lotId);
    },

    upsertDispensation(row) {
      dispensations.set(row.dispensationId, row);
    },
    getDispensation(dispensationId) {
      return dispensations.get(dispensationId);
    },

    appendAuditLog(row) {
      // Idempotency key piggybacks on the id field so the in-memory store can
      // dedupe; the SQL projection passes a deterministic UUID.
      const key = typeof row.id === "string" ? row.id : `${row.eventType}::${row.streamId}::${row.occurredAt.toISOString()}`;
      if (!auditLog.has(key)) {
        auditLog.set(key, row);
      }
    },
    hasAuditLog(key) {
      return auditLog.has(key);
    },
    listAuditLog() {
      return [...auditLog.values()];
    },
  };
};
