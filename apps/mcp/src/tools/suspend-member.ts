import { Members } from "@canna/app-services";
import type { ULID } from "@canna/shared";
import type { ToolDefinition } from "../types.js";

/**
 * Suspend Member (Nível 3 — write) — suspends an ACTIVE member.
 *
 * Wraps `Members.suspendMember` app-service. Only ACTIVE members can be
 * suspended (domain enforced). `suspendedBy` is taken from `ctx.userId`
 * (authenticated operator) — never from args. Association guard prevents
 * cross-association operations.
 *
 * Domain transition: ACTIVE → SUSPENDED
 * To reinstate: use `reinstate_member`.
 */
interface Args {
  readonly memberId: string;
  readonly reason: string;
}

export const suspendMember: ToolDefinition<Args> = {
  name: "suspend_member",
  title: "Suspender Membro",
  description:
    "Suspende um membro ATIVO da associação. Requer memberId e motivo (reason). Apenas membros no estado ACTIVE podem ser suspensos. suspendedBy é o usuário autenticado. Para reativar use reinstate_member. Role: RESPONSAVEL_TECNICO | DIRETORIA.",
  riskLevel: 3,
  allowedRoles: ["RESPONSAVEL_TECNICO", "DIRETORIA"],
  inputSchema: {
    type: "object",
    properties: {
      memberId: {
        type: "string",
        description: "ULID do membro a ser suspenso.",
      },
      reason: {
        type: "string",
        description:
          "Motivo da suspensão (ex: 'Pendência documental', 'Irregularidade detectada em auditoria').",
      },
    },
    required: ["memberId", "reason"],
  },
  uiResourceUri: "ui://member-quota-card/app.html",
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

    const memberId = (args.memberId ?? "").trim();
    if (!memberId) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "MISSING_MEMBER_ID",
              message: "memberId é obrigatório.",
            }),
          },
        ],
      };
    }

    const reason = (args.reason ?? "").trim();
    if (!reason) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "MISSING_REASON",
              message: "reason é obrigatório para suspender um membro.",
            }),
          },
        ],
      };
    }

    const result = await Members.suspendMember(ctx.store, {
      type: "SuspendMember",
      memberId: memberId as ULID,
      reason,
      suspendedBy: ctx.userId as ULID,
      now: ctx.now,
    });

    if (!result.ok) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: result.error.code,
              memberId,
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
            memberId,
            associationId: ctx.associationId,
            status: "SUSPENDED",
            reason,
            suspendedBy: ctx.userId,
            nextStep: "reinstate_member",
            message:
              "Membro suspenso. Para reativar, use reinstate_member.",
          }),
        },
      ],
    };
  },
};
