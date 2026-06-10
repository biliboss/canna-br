import { Members } from "@canna/app-services";
import type { ULID } from "@canna/shared";
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
            // NOTE: actual consumed/remaining computed from association
            // stream — surfaced by the MemberQuotaCardApp via a follow-up
            // tool call. This tool returns the canonical member state only.
          }),
        },
      ],
    };
  },
};
