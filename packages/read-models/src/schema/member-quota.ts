import { numeric, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

/**
 * Read-model projection accumulating monthly consumed grams per member.
 *
 * Source events:
 *  - MemberQuotaConsumed → += quantityG into (memberId, month) row
 *
 * `month` is a string `YYYY-MM` for direct equality with the event payload.
 */
export const memberQuota = pgTable(
  "member_quota",
  {
    memberId: text("member_id").notNull(),
    month: text("month").notNull(),
    consumedG: numeric("consumed_g", { precision: 12, scale: 3 }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.memberId, table.month] }),
  }),
);

export type MemberQuotaRow = typeof memberQuota.$inferSelect;
export type NewMemberQuotaRow = typeof memberQuota.$inferInsert;
