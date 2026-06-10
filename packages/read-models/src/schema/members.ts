import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Read-model projection for members.
 *
 * Source events:
 *  - MemberRegistered    → upsert row (status=PENDING_CONSENT)
 *  - ConsentGranted      → status=ACTIVE, consentVersion
 *  - ConsentRevoked      → status=CONSENT_REVOKED
 *  - MemberSuspended     → status=SUSPENDED
 *  - MemberReinstated    → status=ACTIVE
 *  - MemberAnonymized    → cpfHash="ANONYMIZED", status=ANONYMIZED
 */
export const members = pgTable("members", {
  memberId: text("member_id").primaryKey(),
  associationId: text("association_id").notNull(),
  cpfHash: text("cpf_hash").notNull(),
  status: text("status").notNull(),
  consentVersion: integer("consent_version"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
});

export type MemberRow = typeof members.$inferSelect;
export type NewMemberRow = typeof members.$inferInsert;

export type MemberStatusValue =
  | "PENDING_CONSENT"
  | "ACTIVE"
  | "CONSENT_REVOKED"
  | "SUSPENDED"
  | "ANONYMIZED";
