import { Members, Dispensations } from "@canna/app-services";
import { gramsToNumber, type ULID } from "@canna/shared";
import type { ToolDefinition } from "../types.js";

interface Args {
  readonly memberId: string;
  readonly month?: string;
}

export const getMemberQuota: ToolDefinition<Args> = {
  name: "get_member_quota",
  title: "Member Quota",
  description:
    "Read current monthly quota status for a member. Returns prescription, monthly cap, consumed this month, and remaining grams. Role: DISPENSADOR | RT | DPO | AUDITOR.",
  riskLevel: 1,
  allowedRoles: ["DISPENSADOR", "RESPONSAVEL_TECNICO", "DPO", "AUDITOR", "DIRETORIA"],
  inputSchema: {
    type: "object",
    properties: {
      memberId: { type: "string", description: "ULID of the member" },
      month: {
        type: "string",
        description:
          "Quota window in YYYY-MM. Defaults to current month if omitted.",
      },
    },
    required: ["memberId"],
  },
  uiResourceUri: "ui://member-quota-card/app.html",
  async handler(args, ctx) {
    const { state } = await Members.loadMemberState(
      ctx.store,
      args.memberId as ULID,
    );

    if (state.status === "EMPTY") {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "MEMBER_NOT_FOUND",
              memberId: args.memberId,
            }),
          },
        ],
      };
    }

    const month =
      args.month ??
      `${String(ctx.now.getUTCFullYear())}-${String(ctx.now.getUTCMonth() + 1).padStart(2, "0")}`;

    // Live consumed grams folded from the association MemberQuotaConsumed
    // stream (same accumulator as the `member_quota` read-model). Wires the
    // MemberQuotaCard widget so the progress bar reflects real consumption
    // instead of always rendering 0%.
    const consumed = await Dispensations.loadMemberQuotaConsumed(
      ctx.store,
      state.associationId,
      state.memberId,
      month,
    );
    const consumedG = gramsToNumber(consumed);
    const monthlyQuotaG = state.prescription?.monthlyQuotaG ?? null;
    const remainingG =
      monthlyQuotaG === null
        ? null
        : Math.max(0, gramsToNumber(monthlyQuotaG) - consumedG);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            memberId: state.memberId,
            status: state.status,
            associationId: state.associationId,
            consentVersion: state.consentVersion,
            prescription:
              state.prescription === null
                ? null
                : {
                    prescriptionId: state.prescription.prescriptionId,
                    validFrom: state.prescription.validFrom.toISOString(),
                    validUntil: state.prescription.validUntil.toISOString(),
                    monthlyQuotaG: state.prescription.monthlyQuotaG,
                  },
            month,
            consumedG,
            remainingG,
          }),
        },
      ],
    };
  },
};
