import type { AppManifest } from "../manifest.js";

export const memberLifecycleBoardManifest: AppManifest = {
  resourceUri: "ui://member-lifecycle-board/app.html",
  id: "member-lifecycle-board",
  title: "Painel de Membros — Ciclo de Vida",
  description:
    "Dashboard administrativo do ciclo de vida de associados: colunas Kanban por MemberStatus (Aguardando Consentimento → Ativo → Suspenso → Consentimento Revogado → Anonimizado) com limite de fila na intake, classe de serviço por SLA, e cards LGPD-safe (iniciais + hash CPF).",
  category: "dashboard",
  riskLevel: 1,
  primaryToolName: "get_member_quota",
  secondaryToolNames: [] as const,
  htmlBundlePath: "dist/member-lifecycle-board.html",
};
