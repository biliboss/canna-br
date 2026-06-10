import type { Dispensation } from "@canna/domain";
import type { DomainEvent, QuantityGrams } from "@canna/shared";
import { gramsToNumber } from "@canna/shared";

import type { NewMemberQuotaRow } from "../schema/member-quota.js";

const gramsToNumeric = (q: QuantityGrams): string => gramsToNumber(q).toFixed(3);
const numericToGrams = (n: string): number => Number.parseFloat(n);

/**
 * Pure projection step for the `member_quota` accumulator.
 *
 * Each `MemberQuotaConsumed` event adds `quantityG` to the (memberId, month)
 * row. Idempotency is enforced by the `applyEvents` driver via deterministic
 * event keys recorded in the audit log — projections themselves are stateless
 * delta applicators.
 */
export const projectQuota = (
  state: NewMemberQuotaRow | null,
  event: DomainEvent<string, unknown>,
): NewMemberQuotaRow | null => {
  const typed = event as Dispensation.DispensationEvent;
  if (typed.type !== "MemberQuotaConsumed") return null;

  const previousConsumed = state ? numericToGrams(state.consumedG as string) : 0;
  const delta = gramsToNumber(typed.payload.quantityG);
  const nextConsumed = previousConsumed + delta;

  return {
    memberId: typed.payload.memberId,
    month: typed.payload.month,
    consumedG: gramsToNumeric(nextConsumed as QuantityGrams),
  };
};
