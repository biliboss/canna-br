import type { CannaEventStore } from "@canna/event-store";

export type Role =
  | "DISPENSADOR"
  | "RESPONSAVEL_TECNICO"
  | "DIRETORIA"
  | "DPO"
  | "AUDITOR"
  | "FEDERATION"
  | "GUEST";

export interface ToolContext {
  readonly store: CannaEventStore;
  readonly userId: string;
  readonly role: Role;
  readonly associationId: string;
  readonly chatId?: string;
  readonly now: Date;
}

export interface ToolDefinition<TArgs = Record<string, unknown>> {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly riskLevel: 1 | 2 | 3 | 4;
  readonly allowedRoles: readonly Role[];
  readonly inputSchema: {
    readonly type: "object";
    readonly properties: Record<string, unknown>;
    readonly required?: readonly string[];
  };
  readonly uiResourceUri?: string;
  readonly handler: (
    args: TArgs,
    ctx: ToolContext,
  ) => Promise<{
    readonly content: ReadonlyArray<{
      readonly type: "text";
      readonly text: string;
    }>;
    readonly isError?: boolean;
  }>;
}

export interface CannaMcpDeps {
  readonly store: CannaEventStore;
  /**
   * Resolve incoming OAuth headers/token to the active ToolContext for this
   * request. Apps test stub uses a fixed context; production wires this to
   * the OAuth scope mapping documented in ADR-002.
   */
  readonly resolveContext: (
    headers: Readonly<Record<string, string | undefined>>,
  ) => Promise<ToolContext>;
}
