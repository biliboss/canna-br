import { sql } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Append-only audit log of every DomainEvent.
 *
 * Append-only is enforced at the DATABASE level by PostgreSQL RULEs in the
 * 0001-init.sql migration:
 *
 *   CREATE RULE audit_log_no_update AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
 *   CREATE RULE audit_log_no_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;
 *
 * Applications can INSERT but never UPDATE/DELETE.
 */
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(),
  streamId: text("stream_id").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull(),
  payload: jsonb("payload").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true, mode: "date" })
    .notNull()
    .default(sql`now()`),
});

export type AuditLogRow = typeof auditLog.$inferSelect;
export type NewAuditLogRow = typeof auditLog.$inferInsert;
