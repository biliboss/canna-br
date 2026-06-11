/**
 * Command Center — a config-driven menu system for an assistant-ui + MCP-Apps
 * deployment. Full discoverability (⌘K), contextual quick actions, a floating
 * notification center where each notification expands into an MCP App, and a
 * staged onboarding coach — all fed by one `CommandCenterConfig` and powered by
 * a metrified user-event ledger with a pluggable StorageAdapter.
 *
 * This directory is deployment-agnostic. Provide a `CommandCenterConfig`
 * (see ../command-center.config.ts) and render <CommandCenter/> in your header.
 */
export { CommandCenter } from "./CommandCenter";
export { useUserContext, onboardingIndex } from "./user-context";
export type {
  CCStorageAdapter,
  CCEvent,
  CCEventKind,
} from "./user-context";
export type {
  CommandCenterConfig,
  CCApp,
  CCPrompt,
  CCNotification,
  CCOnboardingStage,
  CCTone,
  Predicted,
  UserStats,
} from "./types";
