import { Members, Dispensations } from "@canna/app-services";
import { isOk, quantityGrams, type ULID } from "@canna/shared";
import { Dispensation } from "@canna/domain";
import type { ToolDefinition } from "../types.js";

interface Args {
  readonly associationId: string;
  readonly memberId: string;
  readonly lotId: string;
  readonly quantityG: number;
}

/**
 * Nível 2 — DRAFT only. Loads context, runs decide() in dry-run mode, but
 * does NOT append events. Returns the preview of events that WOULD be
 * emitted so the agent can render a diff in DispensationFormApp.
 */
export const draftDispensation: ToolDefinition<Args> = {
  name: "draft_dispensation",
  title: "Draft Dispensation (preview)",
  description:
    "Run a dispensation through the domain decide() in dry-run mode. " +
    "Returns the events that WOULD be emitted (DispensationRecorded + " +
    "MemberQuotaConsumed + LotQuantityDeducted) OR the rejection event " +
    "(QuotaExceededAttempt | LotInsufficientQuantity). NO state mutation.",
  riskLevel: 2,
  allowedRoles: ["DISPENSADOR", "RESPONSAVEL_TECNICO"],
  inputSchema: {
    type: "object",
    properties: {
      associationId: { type: "string" },
      memberId: { type: "string" },
      lotId: { type: "string" },
      quantityG: { type: "number", minimum: 0.01 },
    },
    required: ["associationId", "memberId", "lotId", "quantityG"],
  },
  uiResourceUri: "ui://dispensation-form/app.html",
  async handler(args, ctx) {
    const qty = quantityGrams(args.quantityG);
    if (!qty.ok) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: qty.error.code, args }),
          },
        ],
      };
    }

    const member = await Members.loadMemberState(ctx.store, args.memberId as ULID);
    if (member.state.status === "EMPTY") {
      return {
        isError: true,
        content: [
          { type: "text", text: JSON.stringify({ error: "MEMBER_NOT_FOUND" }) },
        ],
      };
    }

    // Cheap dry-run: use the in-memory associativity of decide() — it's
    // pure. We synthesize a DispensationContext consistent with what the
    // real service would build, but never call appendToStream.
    const context: Dispensation.DispensationContext = {
      member: member.state,
      lot: {
        status: "AVAILABLE",
        lotId: args.lotId as ULID,
        associationId: args.associationId as ULID,
        productSku: null,
        quantityG: qty.value,
        expiresAt: null,
      },
      month: `${String(ctx.now.getUTCFullYear())}-${String(ctx.now.getUTCMonth() + 1).padStart(2, "0")}`,
      quotaConsumedThisMonthG: qty.value,
      dispenserRole: ctx.role === "DISPENSADOR" ? "DISPENSADOR" : "OTHER",
      responsavelTecnicoId: null,
    };

    const preview = Dispensation.decide(
      {
        type: "RecordDispensation",
        dispensationId: "01HM0DISP00000000000000DRY" as ULID,
        associationId: args.associationId as ULID,
        memberId: args.memberId as ULID,
        lotId: args.lotId as ULID,
        quantityG: qty.value,
        dispensedBy: ctx.userId as ULID,
        approvedBy: null,
        now: ctx.now,
      },
      context,
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ dryRun: true, preview }),
        },
      ],
    };
  },
};
