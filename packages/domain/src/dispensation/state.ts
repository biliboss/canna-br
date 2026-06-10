import type { QuantityGrams } from "@canna/shared";
import type { LotState } from "../inventory/state.js";
import type { MemberState } from "../membership/state.js";
import { emptyLotState } from "../inventory/state.js";
import { emptyMemberState } from "../membership/state.js";

/**
 * Cross-aggregate state assembled by the app-service before invoking the
 * dispensation use case. Loaded from member stream + lot stream + member
 * quota projection for the target month.
 *
 * The dispensation use case itself remains a pure function over this snapshot.
 */
export interface DispensationContext {
  readonly member: MemberState;
  readonly lot: LotState;
  readonly month: string;
  readonly quotaConsumedThisMonthG: QuantityGrams;
  readonly dispenserRole: "DISPENSADOR" | "RESPONSAVEL_TECNICO" | "ADMIN" | "OTHER";
  readonly responsavelTecnicoId: string | null;
}

export const emptyDispensationContext = (
  month: string,
  zeroG: QuantityGrams,
): DispensationContext => ({
  member: emptyMemberState,
  lot: emptyLotState,
  month,
  quotaConsumedThisMonthG: zeroG,
  dispenserRole: "DISPENSADOR",
  responsavelTecnicoId: null,
});
