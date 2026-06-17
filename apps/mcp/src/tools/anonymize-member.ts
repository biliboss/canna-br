import { Members } from "@canna/app-services";
import type { ULID } from "@canna/shared";
import type { ToolDefinition } from "../types.js";

/**
 * Anonymize Member (Nível 3 — write) — LGPD Art. 18 IV crypto-delete.
 *
 * Wraps `Members.anonymizeMember` app-service (same command the domain enforces
 * via the AnonymizeMember decider). Irreversible: the `MemberAnonymized` event
 * resets the aggregate to a minimal state — `cpfHash` is dropped (set to null)
 * and `status` becomes ANONYMIZED. Used to honour the titular's right to
 * erasure (LGPD Art. 18 IV) or when the legal retention period expires.
 *
 * `anonymizedBy` is taken from `ctx.userId` (authenticated DPO/diretoria) —
 * never from args. Association guard prevents cross-association operations.
 *
 * Role: DPO | DIRETORIA — erasure is a privileged data-protection operation.
 */
interface Args {
  readonly memberId: string;
  readonly reason?: "LGPD_ART_18_IV" | "INACTIVE_RETENTION_EXPIRED";
}

export const anonymizeMember: ToolDefinition<Args> = {
  name: "anonymize_member",
  title: "Anonimizar Membro (LGPD Art. 18)",
  description:
    "Anonimiza um membro de forma irreversível (LGPD Art. 18 IV — direito ao apagamento / crypto-delete). Requer memberId; reason opcional (LGPD_ART_18_IV padrão | INACTIVE_RETENTION_EXPIRED). Remove o cpfHash e transita o membro para ANONYMIZED. Operação irreversível. Role: DPO | DIRETORIA.",
  riskLevel: 3,
  allowedRoles: ["DPO", "DIRETORIA"],
  inputSchema: {
    type: "object",
    properties: {
      memberId: {
        type: "string",
        description: "ULID do membro a ser anonimizado (irreversível).",
      },
      reason: {
        type: "string",
        enum: ["LGPD_ART_18_IV", "INACTIVE_RETENTION_EXPIRED"],
        description:
          "Base para a anonimização. LGPD_ART_18_IV = pedido de apagamento do titular (padrão). INACTIVE_RETENTION_EXPIRED = expiração do prazo legal de retenção.",
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

    const reason = args.reason ?? "LGPD_ART_18_IV";

    const result = await Members.anonymizeMember(ctx.store, {
      type: "AnonymizeMember",
      memberId: memberId as ULID,
      reason,
      anonymizedBy: ctx.userId as ULID,
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

    // Confirm the crypto-delete landed: cpfHash must be gone after the event.
    const { state } = await Members.loadMemberState(ctx.store, memberId);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            memberId,
            associationId: ctx.associationId,
            status: state.status,
            cpfHashErased: state.cpfHash === null,
            reason,
            anonymizedBy: ctx.userId,
            irreversible: true,
            message:
              "Membro anonimizado de forma irreversível (LGPD). Dados pessoais (cpfHash) removidos.",
          }),
        },
      ],
    };
  },
};
