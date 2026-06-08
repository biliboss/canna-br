export type AppCategory =
  | "read-only-card"
  | "timeline"
  | "form"
  | "approval"
  | "dashboard";

export type AppRiskLevel = 1 | 2 | 3;

export interface AppManifest {
  /** ui:// URI declared by the MCP tool that opens this app. */
  readonly resourceUri: string;
  /** Stable id used for telemetry and Pending action references. */
  readonly id: string;
  /** Short title shown in the chat host's app affordance. */
  readonly title: string;
  /** One-line description for the host UI. */
  readonly description: string;
  readonly category: AppCategory;
  /** Mirrors the corresponding MCP tool's risk level. */
  readonly riskLevel: AppRiskLevel;
  /** Tool name that opens (or is called from) this app. */
  readonly primaryToolName: string;
  /** Additional tools the app may call back into during interaction. */
  readonly secondaryToolNames: readonly string[];
  /** Relative path to the single-file HTML bundle (built by vite-plugin-singlefile). */
  readonly htmlBundlePath: string;
}
