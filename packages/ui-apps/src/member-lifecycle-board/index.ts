import type { AppManifest } from "../manifest.js";

export const memberLifecycleBoardManifest: AppManifest = {
  resourceUri: "ui://member-lifecycle-board/app.html",
  id: "member-lifecycle-board",
  title: "Painel de Membros — Ciclo de Vida",
  description:
    "Dashboard administrativo do ciclo de vida de associados: colunas Kanban por MemberStatus (Aguardando Consentimento → Ativo → Suspenso → Consentimento Revogado → Anonimizado) com limite de fila na intake, classe de serviço por SLA, e cards LGPD-safe (iniciais + hash CPF).",
  category: "dashboard",
  riskLevel: 1,
  // Backed by get_members_by_status (Nível 1, read-only) which queries the
  // members read-model projection grouped by MemberStatus, scoped to
  // ctx.associationId. Tool ships in apps/mcp/src/tools/get-members-by-status.ts
  // and is registered in tools/index.ts. The board renders all Kanban columns
  // (PENDING_CONSENT → ACTIVE → SUSPENDED → CONSENT_REVOKED → ANONYMIZED) from
  // a single get_members_by_status call (no status filter) and can optionally
  // refetch a single column by passing status=<value>.
  primaryToolName: "get_members_by_status",
  secondaryToolNames: [] as const,
  htmlBundlePath: "dist/member-lifecycle-board.html",
};
