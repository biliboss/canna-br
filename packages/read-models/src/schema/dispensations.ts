import { numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Read-model projection for dispensation records.
 *
 * Source events:
 *  - DispensationRecorded → insert row
 */
export const dispensations = pgTable("dispensations", {
  dispensationId: text("dispensation_id").primaryKey(),
  associationId: text("association_id").notNull(),
  memberId: text("member_id").notNull(),
  lotId: text("lot_id").notNull(),
  prescriptionId: text("prescription_id").notNull(),
  quantityG: numeric("quantity_g", { precision: 12, scale: 3 }).notNull(),
  dispensedBy: text("dispensed_by").notNull(),
  approvedBy: text("approved_by"),
  dispensedAt: timestamp("dispensed_at", { withTimezone: true, mode: "date" }).notNull(),
});

export type DispensationRow = typeof dispensations.$inferSelect;
export type NewDispensationRow = typeof dispensations.$inferInsert;
