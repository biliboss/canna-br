import type { MemberStatusValue } from "@canna/read-models";
import type { ToolDefinition } from "../types.js";

/**
 * get_members_by_status — Nível 1 (read-only).
 *
 * Returns all members for the caller's association grouped by MemberStatus,
 * optionally filtered to a single status column. Powers the Painel de Membros
 * (member-lifecycle-board) Kanban widget.
 *
 * Design:
 *  - Scoped to ctx.associationId — no cross-tenant data.
 *  - Never returns raw CPF; only cpfHash (LGPD-safe) + memberId + status.
 *  - readModelStore is required; returns READ_MODEL_STORE_UNAVAILABLE if absent.
 *  - Groups results by status when no filter supplied, so the widget can
 *    populate all columns in one call.
 */

interface Args {
  readonly status?: string;
}

const VALID_STATUSES = new Set<MemberStatusValue>([
  "PENDING_CONSENT",
  "ACTIVE",
  "CONSENT_REVOKED",
  "SUSPENDED",
  "ANONYMIZED",
]);

const isValidStatus = (s: string): s is MemberStatusValue =>
  VALID_STATUSES.has(s as MemberStatusValue);

export const getMembersByStatus: ToolDefinition<Args> = {
  name: "get_members_by_status",
  title: "Membros por Status",
  description:
    "Lista todos os membros da associação agrupados por MemberStatus. Optionally filtrar por status específico (PENDING_CONSENT | ACTIVE | CONSENT_REVOKED | SUSPENDED | ANONYMIZED). Retorna dados LGPD-safe (memberId + cpfHash + status + datas). Usado pelo widget Painel de Membros — Ciclo de Vida. Role: DISPENSADOR | RT | DPO | AUDITOR | DIRETORIA.",
  riskLevel: 1,
  allowedRoles: [
    "DISPENSADOR",
    "RESPONSAVEL_TECNICO",
    "DPO",
    "AUDITOR",
    "DIRETORIA",
  ],
  inputSchema: {
    type: "object",
    properties: {
      status: {
        type: "string",
        description:
          "Filtrar por status específico. Omitir para retornar todos os membros agrupados. Valores: PENDING_CONSENT | ACTIVE | CONSENT_REVOKED | SUSPENDED | ANONYMIZED.",
        enum: [
          "PENDING_CONSENT",
          "ACTIVE",
          "CONSENT_REVOKED",
          "SUSPENDED",
          "ANONYMIZED",
        ],
      },
    },
    required: [],
  },
  uiResourceUri: "ui://member-lifecycle-board/app.html",
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

    if (ctx.readModelStore === undefined) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "READ_MODEL_STORE_UNAVAILABLE",
              message:
                "O store de leitura não está disponível neste deployment. Contate o administrador.",
            }),
          },
        ],
      };
    }

    const statusFilter = args.status;
    if (statusFilter !== undefined && !isValidStatus(statusFilter)) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "INVALID_STATUS",
              message: `Status inválido: "${statusFilter}". Valores válidos: ${[...VALID_STATUSES].join(" | ")}.`,
            }),
          },
        ],
      };
    }

    const rows = await ctx.readModelStore.listMembersByStatus(
      ctx.associationId,
      statusFilter,
    );

    // Group by status for the Kanban widget (all-members call)
    const grouped: Record<string, Array<{
      memberId: string;
      cpfHash: string;
      consentVersion: number | null | undefined;
      createdAt: string;
      updatedAt: string;
    }>> = {};

    for (const row of rows) {
      if (!grouped[row.status]) {
        grouped[row.status] = [];
      }
      grouped[row.status]!.push({
        memberId: row.memberId,
        cpfHash: row.cpfHash,
        consentVersion: row.consentVersion,
        createdAt: row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : String(row.createdAt),
        updatedAt: row.updatedAt instanceof Date
          ? row.updatedAt.toISOString()
          : String(row.updatedAt),
      });
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            associationId: ctx.associationId,
            statusFilter: statusFilter ?? null,
            totalCount: rows.length,
            grouped,
            // viewerRole drives role-gated lifecycle action buttons in the
            // member-lifecycle-board widget (fail-closed when absent).
            viewerRole: ctx.role,
          }),
        },
      ],
    };
  },
};
