import { Dispensations } from "@canna/app-services";
import type { ULID } from "@canna/shared";
import type { ToolDefinition } from "../types.js";

interface Args {
  readonly associationId: string;
  /** Id of the pending dispensation request (returned by request_record_dispensation). */
  readonly dispensationId: string;
}

/**
 * Nível 3 — WRITE. RDC 1.014 Step 2 (APPROVE). A DISTINCT approver
 * (RESPONSAVEL_TECNICO | DIRETORIA) effects a previously-requested
 * dispensation. The original member/lot/quantity/requester are recovered from
 * the stored `DispensationRequested` event — the approver supplies ONLY the
 * dispensationId, so they cannot tamper with the request. Quota + inventory are
 * validated HERE; on success appends DispensationRecorded + MemberQuotaConsumed
 * + LotQuantityDeducted atomically (quota consumed at this point, not before).
 *
 * Segregation of duties: if the approver is the same identity as the original
 * requester, the domain returns APPROVAL_SEGREGATION_VIOLATION — even when that
 * person also holds an approver role. The requester can NEVER approve their own.
 */
export const approveDispensation: ToolDefinition<Args> = {
  name: "approve_dispensation",
  title: "Approve Dispensation (RDC 1.014)",
  description:
    "RDC 1.014 — APROVA e efetiva uma dispensação pendente (passo 2 de 2). " +
    "Recupera a solicitação original do stream e, validando cota + estoque, " +
    "anexa atomicamente DispensationRecorded + MemberQuotaConsumed + " +
    "LotQuantityDeducted (a cota é consumida agora). Segregação de função: o " +
    "solicitante NÃO pode aprovar a própria dispensação. " +
    "Roles: RESPONSAVEL_TECNICO, DIRETORIA.",
  riskLevel: 3,
  allowedRoles: ["RESPONSAVEL_TECNICO", "DIRETORIA"],
  inputSchema: {
    type: "object",
    properties: {
      associationId: { type: "string" },
      dispensationId: {
        type: "string",
        description: "ULID da dispensação pendente a aprovar.",
      },
    },
    required: ["associationId", "dispensationId"],
  },
  uiResourceUri: "ui://dispensation-form/app.html",
  async handler(args, ctx) {
    if (!ctx.associationId || ctx.associationId === "unknown") {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "NO_ASSOCIATION_CONTEXT",
              message: "Sem associação no contexto (x-canna-association).",
            }),
          },
        ],
      };
    }

    const approverRole =
      ctx.role === "DIRETORIA" ? "DIRETORIA" : "RESPONSAVEL_TECNICO";

    const result = await Dispensations.approveDispensation(
      { store: ctx.store, approverRole },
      {
        type: "ApproveDispensation",
        dispensationId: args.dispensationId as ULID,
        associationId: args.associationId as ULID,
        approvedBy: ctx.userId as ULID,
        now: ctx.now,
      },
    );

    if (!result.ok) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: result.error.code,
              message: result.error.message,
              dispensationId: args.dispensationId,
            }),
          },
        ],
      };
    }

    const recorded = result.value.events.find(
      (e) => e.type === "DispensationRecorded",
    );

    // The effect decider may emit a rejection event (QuotaExceededAttempt |
    // LotInsufficientQuantity) instead of recording. Those append (audit) but
    // the dispensation did NOT happen — surface clearly.
    if (!recorded) {
      const rejection = result.value.events[0];
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "REJECTED",
              reason: rejection?.type ?? "UNKNOWN",
              dispensationId: args.dispensationId,
            }),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "RECORDED",
            dispensationId: args.dispensationId,
            associationId: ctx.associationId,
            approvedBy: ctx.userId,
            emittedEvents: result.value.events.map((e) => e.type),
            nextStep: "get_member_quota",
            message:
              "Dispensação APROVADA e efetivada. Cota do membro deduzida — " +
              "consulte get_member_quota.",
          }),
        },
      ],
    };
  },
};
