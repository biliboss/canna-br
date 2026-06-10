import { numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Read-model projection for inventory lots.
 *
 * Source events:
 *  - LotCreated             → upsert (status=QUARANTINED, currentQuantityG=initial)
 *  - LotQuarantined         → status=QUARANTINED
 *  - LotReleased            → status=RELEASED
 *  - LotQuantityDeducted    → currentQuantityG=quantityAfterG
 *  - LotRecalled            → status=RECALLED
 *  - LotExhausted           → status=EXHAUSTED, currentQuantityG=0
 */
export const inventoryLots = pgTable("inventory_lots", {
  lotId: text("lot_id").primaryKey(),
  associationId: text("association_id").notNull(),
  productSku: text("product_sku").notNull(),
  status: text("status").notNull(),
  initialQuantityG: numeric("initial_quantity_g", { precision: 12, scale: 3 }).notNull(),
  currentQuantityG: numeric("current_quantity_g", { precision: 12, scale: 3 }).notNull(),
  producedAt: timestamp("produced_at", { withTimezone: true, mode: "date" }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
});

export type InventoryLotRow = typeof inventoryLots.$inferSelect;
export type NewInventoryLotRow = typeof inventoryLots.$inferInsert;

export type LotStatusValue = "QUARANTINED" | "RELEASED" | "RECALLED" | "EXHAUSTED";
