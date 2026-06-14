import { Members } from "@canna/app-services";
import type { ULID } from "@canna/shared";
import type { ToolDefinition } from "../types.js";

/**
 * Grant Consent (Nível 3 — write) — transitions a PENDING_CONSENT member to
 * ACTIVE by recording the consent event.
 *
 * Wraps `Members.grantConsent` app-service (same command the domain enforces
 * via the GrantConsent decider). No duplicated domain logic here.
 *
 * memberId is required from the caller (returned by register_member).
 * consentVersion defaults to the current consent document version (1) — pass
 * explicitly when the association upgrades its consent form.
 * grantedBy is taken from ctx.userId (authenticated operator), never from args.
 * associationId guard prevents cross-association ops.
 *
 * Result: member transitions to ACTIVE. The next step is validate_prescription.
 */

/** Current consent document version. Bump this whenever the terms change. */
const CURRENT_CONSENT_VERSION = 1;

interface Args {
  readonly memberId: string;
  readonly consentVersion?: number;
}

export const grantConsent: ToolDefinition<Args> = {
  name: "grant_consent",
  title: "Registrar Consentimento",
  description:
    "Registra o consentimento de um membro (PENDING_CONSENT → ACTIVE). memberId obrigatório (retornado por register_member). consentVersion opcional — padrão é a versão atual do documento de consentimento. Role: RESPONSAVEL_TECNICO | DIRETORIA.",
  riskLevel: 3,
  allowedRoles: ["RESPONSAVEL_TECNICO", "DIRETORIA"],
  inputSchema: {
    type: "object",
    properties: {
      memberId: {
        type: "string",
        description: "ULID do membro retornado por register_member.",
      },
      consentVersion: {
        type: "number",
        description:
          "Versão do documento de consentimento (padrão: versão atual). Informe apenas se o associado está assinando uma revisão específica do termo.",
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

    const consentVersion = args.consentVersion ?? CURRENT_CONSENT_VERSION;

    const result = await Members.grantConsent(ctx.store, {
      type: "GrantConsent",
      memberId: memberId as ULID,
      consentVersion,
      grantedBy: ctx.userId as ULID,
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
              consentVersion,
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
            consentVersion,
            grantedBy: ctx.userId,
            nextStep: "validate_prescription",
            message:
              "Consentimento registrado. Membro ATIVO — próximo passo: validar receita (validate_prescription).",
          }),
        },
      ],
    };
  },
};
