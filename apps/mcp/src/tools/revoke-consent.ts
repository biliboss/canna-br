import { Members } from "@canna/app-services";
import type { ULID } from "@canna/shared";
import type { ToolDefinition } from "../types.js";

/**
 * Revoke Consent (Nível 3 — write) — LGPD direito de retirada do consentimento.
 *
 * Wraps `Members.revokeConsent` app-service (same command the domain enforces
 * via the RevokeConsent decider). The titular may withdraw consent at any time
 * (LGPD Art. 8 §5). Domain transition: ACTIVE → SUSPENDED (consentVersion
 * cleared). Only ACTIVE members with granted consent can revoke.
 *
 * `revokedBy` is taken from `ctx.userId` (authenticated operator acting on the
 * titular's request) — never from args. Association guard prevents
 * cross-association operations.
 *
 * Role: RESPONSAVEL_TECNICO | DIRETORIA | DPO — the operator/DPO processes the
 * titular's withdrawal request.
 */
interface Args {
  readonly memberId: string;
}

export const revokeConsent: ToolDefinition<Args> = {
  name: "revoke_consent",
  title: "Revogar Consentimento (LGPD)",
  description:
    "Revoga o consentimento de um membro a pedido do titular (LGPD Art. 8 §5 — direito de retirada). Requer memberId. Apenas membros ACTIVE com consentimento ativo podem revogar; o membro transita para SUSPENDED. revokedBy é o usuário autenticado. Role: RESPONSAVEL_TECNICO | DIRETORIA | DPO.",
  riskLevel: 3,
  allowedRoles: ["RESPONSAVEL_TECNICO", "DIRETORIA", "DPO"],
  inputSchema: {
    type: "object",
    properties: {
      memberId: {
        type: "string",
        description: "ULID do membro cujo consentimento será revogado.",
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

    const result = await Members.revokeConsent(ctx.store, {
      type: "RevokeConsent",
      memberId: memberId as ULID,
      revokedBy: ctx.userId as ULID,
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
            consentRevoked: true,
            revokedBy: ctx.userId,
            nextStep: "grant_consent",
            message:
              "Consentimento revogado (LGPD). Membro SUSPENSO — para reativar é necessário registrar novo consentimento (grant_consent).",
          }),
        },
      ],
    };
  },
};
