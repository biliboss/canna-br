/**
 * Command Center — types.
 *
 * The Command Center is the single, config-driven menu surface for an
 * assistant-ui + MCP-Apps deployment. One `CommandCenterConfig` per deployment
 * (canna-br association, master-espresso subscriptions, …) feeds EVERY surface:
 * the ⌘K palette, the contextual quick-actions strip, the floating notification
 * center, and the staged onboarding coach.
 *
 * Premise (borrowed from /manager): everything is metrified. We keep a small
 * user-event ledger (see ./user-context) so the menu can PREDICT the next best
 * action and reveal complexity gradually — the manager fleet-ledger model,
 * applied to the END USER instead of the agent fleet.
 */

/** An MCP App: a tool the agent calls to render an interactive widget inline. */
export type CCApp = {
  id: string;
  title: string;
  description?: string;
  /** Templated user message that makes the agent call the widget-rendering tool. */
  prompt: string;
  icon?: string; // emoji keeps the menu zero-dependency + theme-free
  group?: string;
  keywords?: string[];
  /** Onboarding gate: app only appears once the user reaches this stage (0 = always). */
  unlockStage?: number;
  /** Surfaced first on a cold start, before any usage history exists. */
  starter?: boolean;
};

/** A pre-made prompt — discoverability of "things you can ask", not just apps. */
export type CCPrompt = {
  id: string;
  label: string;
  prompt: string;
  icon?: string;
  keywords?: string[];
  unlockStage?: number;
};

export type CCTone = "info" | "warn" | "success" | "urgent";

/** A notification = a glanceable signal that can EXPAND into a full MCP App. */
export type CCNotification = {
  id: string;
  title: string;
  body?: string;
  tone?: CCTone;
  count?: number;
  /** When set, acting on the notification launches this MCP App (prompt → tool). */
  launchPrompt?: string;
  /** Epoch ms; omit for "just now". */
  ts?: number;
};

/** Derived, serializable view of the user's metrified state — drives onboarding. */
export type UserStats = {
  launches: number;
  distinctApps: number;
  appsUsed: string[];
  openedPalette: boolean;
  launchedFromPalette: boolean;
  openedNotifications: boolean;
};

export type CCOnboardingStage = {
  id: number;
  title: string;
  hint: string;
  /** The stage is complete once this predicate over the user's metrics is true. */
  doneWhen: (s: UserStats) => boolean;
  /** Optional one-tap action that helps the user clear the stage. */
  cta?: { label: string; prompt?: string };
};

export type CommandCenterConfig = {
  /** Shown as the context chip: "Associação · canna-br". */
  contextLabel: string;
  apps: CCApp[];
  prompts: CCPrompt[];
  notifications?: CCNotification[];
  onboarding?: CCOnboardingStage[];
  docsHref?: string;
};

/** A ranked item the palette/quick-actions surface as "Para você" (predicted). */
export type Predicted = {
  id: string;
  title: string;
  prompt: string;
  icon?: string;
  kind: "app" | "prompt";
  reason: "frecency" | "starter" | "time";
};
