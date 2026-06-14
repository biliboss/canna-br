import { Members } from "@canna/app-services";
import type { ULID } from "@canna/shared";
import type { ToolDefinition } from "../types.js";

/**
 * Reinstate Member (Nível 3 — write) — reinstates a SUSPENDED member to ACTIVE.
 *
 * Wraps `Members.reinstateMember` app-service. Only SUSPENDED members can be
 * reinstated (domain enforced). `reinstatedBy` is taken from `ctx.userId`
 * (authenticated operator) — never from args. Association guard prevents
 * cross-association operations.
 *
 * Domain transition: SUSPENDED → ACTIVE
 * Prerequisite: member must have been suspended via `suspend_member`.
 */
interface Args {
  readonly memberId: string;
}

export const reinstateMember: ToolDefinition<Args> = {
  name: "reinstate_member",
  title: "Reativar Membro",
  description:
    "Reativa um membro SUSPENSO, retornando-o ao estado ACTIVE. Requer apenas memberId. Apenas membros no estado SUSPENDED podem ser reativados. reinstatedBy é o usuário autenticado. Role: RESPONSAVEL_TECNICO | DIRETORIA.",
  riskLevel: 3,
  allowedRoles: ["RESPONSAVEL_TECNICO", "DIRETORIA"],
  inputSchema: {
    type: "object",
    properties: {
      memberId: {
        type: "string",
        description: "ULID do membro a ser reativado (deve estar SUSPENDED).",
      },
    },
    required: ["memberId"],
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

    const result = await Members.reinstateMember(ctx.store, {
      type: "ReinstateMember",
      memberId: memberId as ULID,
      reinstatedBy: ctx.userId as ULID,
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
            status: "ACTIVE",
            reinstatedBy: ctx.userId,
            nextStep: "validate_prescription",
            message:
              "Membro reativado. Estado retornou a ACTIVE.",
          }),
        },
      ],
    };
  },
};
