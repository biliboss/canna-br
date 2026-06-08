import { numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Read-model projection for active prescriptions.
 *
 * Source events:
 *  - PrescriptionValidated → upsert row
 *  - QuotaUpdated          → newQuotaG
 */
export const prescriptions = pgTable("prescriptions", {
  prescriptionId: text("prescription_id").primaryKey(),
  memberId: text("member_id").notNull(),
  physicianCRM: text("physician_crm").notNull(),
  validFrom: timestamp("valid_from", { withTimezone: true, mode: "date" }).notNull(),
  validUntil: timestamp("valid_until", { withTimezone: true, mode: "date" }).notNull(),
  monthlyQuotaG: numeric("monthly_quota_g", { precision: 12, scale: 3 }).notNull(),
  validatedAt: timestamp("validated_at", { withTimezone: true, mode: "date" }).notNull(),
});

export type PrescriptionRow = typeof prescriptions.$inferSelect;
export type NewPrescriptionRow = typeof prescriptions.$inferInsert;
