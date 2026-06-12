import type { AppManifest } from "../manifest.js";

export const memberLifecycleBoardManifest: AppManifest = {
  resourceUri: "ui://member-lifecycle-board/app.html",
  id: "member-lifecycle-board",
  title: "Painel de Membros — Ciclo de Vida",
  description:
    "Dashboard administrativo do ciclo de vida de associados: colunas Kanban por MemberStatus (Aguardando Consentimento → Ativo → Suspenso → Consentimento Revogado → Anonimizado) com limite de fila na intake, classe de serviço por SLA, e cards LGPD-safe (iniciais + hash CPF).",
  category: "dashboard",
  riskLevel: 1,
  // Option B (blocker #6): this board renders an aggregate of ALL members
  // grouped by MemberStatus. No backing MCP tool exists, and one is NOT
  // trivially derivable: CannaEventStore exposes only per-stream readStream/
  // aggregateStream (no cross-stream enumeration) and ReadModelStore exposes
  // only per-id getters (no listMembers / listMembersByStatus). Unlike
  // list_available_lots (empty list = valid "no lots" state), an empty
  // lifecycle Kanban would misrepresent the association as having zero
  // members — a lying widget. So the board is withheld from the registry
  // (see ../registry.ts) and is never advertised as launchable.
  //
  // primaryToolName previously (wrongly) pointed at `get_member_quota` (a
  // single-member tool with an incompatible payload), then at the canonical-
  // but-nonexistent `get_member_lifecycle`. Until a cross-member lifecycle
  // read-model + tool ship, we use an explicit UNAVAILABLE sentinel rather
  // than naming a tool that does not exist — so no consumer of the exported
  // manifest is told to call a phantom tool.
  primaryToolName: "__unavailable__:get_member_lifecycle",
  secondaryToolNames: [] as const,
  htmlBundlePath: "dist/member-lifecycle-board.html",
};
