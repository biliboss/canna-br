import type { ULID } from "@canna/shared";
import type { ToolDefinition } from "../types.js";

interface Args {
  readonly associationId: string;
  readonly memberId: string;
  readonly lotId: string;
  readonly quantityG: number;
  readonly justification?: string;
}

/**
 * Nível 3 — WRITE-WITH-APPROVAL. Creates a PendingAction; an approver
 * (RT or DIRETORIA) must confirm via `approve_pending_action` before the
 * actual dispensation is recorded. PendingAction persistence is handled
 * by @canna/app-services in a future PR; this tool returns the action id
 * as a stub for v0.2.1 scaffold.
 */
export const requestRecordDispensation: ToolDefinition<Args> = {
  name: "request_record_dispensation",
  title: "Request Record Dispensation (approval gate)",
  description:
    "Submit a dispensation for human approval. Creates a PendingAction; " +
    "approver authorizes via `approve_pending_action` before the domain " +
    "emits DispensationRecorded + MemberQuotaConsumed + LotQuantityDeducted.",
  riskLevel: 3,
  allowedRoles: ["DISPENSADOR"],
  inputSchema: {
    type: "object",
    properties: {
      associationId: { type: "string" },
      memberId: { type: "string" },
      lotId: { type: "string" },
      quantityG: { type: "number", minimum: 0.01 },
      justification: { type: "string" },
    },
    required: ["associationId", "memberId", "lotId", "quantityG"],
  },
  uiResourceUri: "ui://pending-action-approval/app.html",
  async handler(args, ctx) {
    // v0.2.1 stub: store PendingAction once @canna/app-services exposes the
    // surface. For now, return a deterministic id so MCP hosts can wire
    // the approval flow ahead of the persistence landing.
    const pendingActionId = `pending:${String(ctx.now.getTime())}:${String(args.memberId)}`;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            pendingActionId,
            type: "RecordDispensation",
            requestedBy: ctx.userId as ULID,
            args,
            status: "PENDING_APPROVAL",
            note:
              "v0.2.1 scaffold — persistence + approval tools land alongside " +
              "@canna/app-services PendingAction infra.",
          }),
        },
      ],
    };
  },
};
