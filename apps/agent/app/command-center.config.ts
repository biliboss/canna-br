/**
 * command-center.config — canna-br deployment menu configuration.
 *
 * One config per deployment drives the whole Command Center (⌘K palette,
 * quick-actions strip, notification center, onboarding). Swap this file to
 * re-skin the same engine for another context.
 *
 * This instance is the canna-br medical-cannabis association admin agent.
 * LGPD: copy never exposes full CPF or full name — the apps render initials +
 * hash only; the menu only ever sends prompts, never PII.
 */
import type { CommandCenterConfig } from "./command-center";

const P = {
  members: "Mostra o painel de membros (ciclo de vida)",
  quotas: "Scorecard de cotas mensais",
  lotes: "Lotes em estoque e validade",
  sngpc: "Fila de submissões SNGPC",
  prescricoes: "Validade das prescrições",
  dispensacoes: "Throughput de dispensações",
} as const;

export const CANNA_COMMAND_CENTER: CommandCenterConfig = {
  contextLabel: "Associação · canna-br",

  apps: [
    {
      id: "members",
      title: "Membros — ciclo de vida",
      description: "Intake → ativo → renovação",
      prompt: P.members,
      icon: "🧑‍🤝‍🧑",
      keywords: ["associados", "membros", "kanban", "onboarding", "lifecycle"],
      starter: true,
    },
    {
      id: "quotas",
      title: "Cotas mensais",
      description: "Scorecard de uso vs. teto",
      prompt: P.quotas,
      icon: "📊",
      keywords: ["cota", "quota", "limite", "anvisa", "grama"],
      starter: true,
    },
    {
      id: "lotes",
      title: "Estoque & lotes",
      description: "Saldo e validade",
      prompt: P.lotes,
      icon: "📦",
      keywords: ["estoque", "lote", "validade", "óleo", "extrato"],
    },
    {
      id: "sngpc",
      title: "Fila SNGPC",
      description: "Submissões pendentes",
      prompt: P.sngpc,
      icon: "📋",
      keywords: ["sngpc", "anvisa", "regulatório", "submissão"],
    },
    {
      id: "prescricoes",
      title: "Prescrições",
      description: "Validade e renovação",
      prompt: P.prescricoes,
      icon: "📄",
      keywords: ["prescrição", "receita", "médico", "laudo"],
    },
    {
      id: "dispensacoes",
      title: "Dispensações",
      description: "Throughput operacional",
      prompt: P.dispensacoes,
      icon: "💊",
      keywords: ["dispensação", "entrega", "throughput", "fluxo"],
    },
  ],

  prompts: [
    {
      id: "novos-semana",
      label: "Quem entrou esta semana?",
      prompt: "Quais membros entraram esta semana e em que etapa estão?",
      icon: "🆕",
      keywords: ["novos", "intake", "semana"],
    },
    {
      id: "resumo-hoje",
      label: "Resumo operacional de hoje",
      prompt: "Me dá um resumo operacional de hoje: cotas, estoque e fila SNGPC.",
      icon: "☀️",
      keywords: ["resumo", "hoje", "diário", "standup"],
    },
    {
      id: "atencao",
      label: "O que precisa de atenção?",
      prompt: "O que precisa de atenção agora? Liste pendências por prioridade.",
      icon: "⚠️",
      keywords: ["atenção", "pendência", "prioridade", "alerta"],
      unlockStage: 1,
    },
  ],

  notifications: [
    {
      id: "cotas-vencendo",
      title: "Cotas vencendo este mês",
      body: "Membros perto do teto mensal. Reveja antes do fechamento.",
      tone: "warn",
      count: 3,
      launchPrompt: P.quotas,
    },
    {
      id: "lote-validade",
      title: "Lote L-204 vence em 7 dias",
      body: "Priorize dispensação ou baixa de estoque.",
      tone: "warn",
      launchPrompt: P.lotes,
    },
    {
      id: "sngpc-pendente",
      title: "Submissões SNGPC pendentes",
      body: "Fila aguardando envio à ANVISA.",
      tone: "urgent",
      count: 2,
      launchPrompt: P.sngpc,
    },
  ],

  onboarding: [
    {
      id: 0,
      title: "Abra seu primeiro painel",
      hint: "Clique numa ação rápida acima ou pressione ⌘K. O painel aparece direto na conversa.",
      doneWhen: (s) => s.launches >= 1,
      cta: { label: "Ver painel de membros", prompt: P.members },
    },
    {
      id: 1,
      title: "Descubra tudo com ⌘K",
      hint: "Pressione ⌘K para buscar qualquer app, prompt ou ação — discoverability completa.",
      doneWhen: (s) => s.openedPalette,
    },
    {
      id: 2,
      title: "Fique de olho no sino",
      hint: "As notificações mostram cotas e prazos. Cada alerta abre o painel certo.",
      doneWhen: (s) => s.openedNotifications,
    },
    {
      id: 3,
      title: "Explore 3 painéis",
      hint: "Quanto mais você usa, melhor a aba 'Para você' prevê o próximo passo.",
      doneWhen: (s) => s.distinctApps >= 3,
    },
  ],
};
