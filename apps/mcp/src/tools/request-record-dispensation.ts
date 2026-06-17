import { Dispensations } from "@canna/app-services";
import { quantityGrams, systemIdGenerator, type ULID } from "@canna/shared";
import type { ToolDefinition } from "../types.js";

interface Args {
  readonly associationId: string;
  readonly memberId: string;
  readonly lotId: string;
  readonly quantityG: number;
  readonly justification?: string;
  /** Optional explicit dispensation id (ULID). Server-generated when absent. */
  readonly dispensationId?: string;
}

/**
 * Nível 3 — WRITE. Records a dispensation for real: loads Member + Lot + Quota
 * context, runs the `RecordDispensation` decider, and atomically appends the
 * emitted events (DispensationRecorded + MemberQuotaConsumed +
 * LotQuantityDeducted) to the association stream via the
 * `Dispensations.recordDispensation` app-service.
 *
 * APPROVAL GATE — KNOWN GAP (wave.6): a separate two-step approval flow
 * (PendingAction + `approve_pending_action`) does NOT exist yet, so this tool
 * records directly. `approvedBy` is therefore `null` and the domain's
 * approval-segregation guard (which only fires when `approvedBy` is non-null)
 * does not engage. A lone DISPENSADOR can self-dispense without a separate
 * approver. The RDC1.014 self-approval guard is deferred to a future PR.
 */
export const requestRecordDispensation: ToolDefinition<Args> = {
  name: "request_record_dispensation",
  title: "Record Dispensation",
  description:
    "Registra uma dispensação real: aplica o decider RecordDispensation e " +
    "anexa atomicamente DispensationRecorded + MemberQuotaConsumed + " +
    "LotQuantityDeducted ao stream da associação (ou o evento de rejeição " +
    "QuotaExceededAttempt | LotInsufficientQuantity). A cota do membro é " +
    "deduzida via projeção member_quota. Role: DISPENSADOR.",
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
      dispensationId: {
        type: "string",
        description: "ULID opcional; gerado pelo servidor quando ausente.",
      },
    },
    required: ["associationId", "memberId", "lotId", "quantityG"],
  },
  uiResourceUri: "ui://dispensation-form/app.html",
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

    const qty = quantityGrams(args.quantityG);
    if (!qty.ok) {
      return {
        isError: true,
        content: [
          { type: "text", text: JSON.stringify({ error: qty.error.code, args }) },
        ],
      };
    }

    const dispensationId = (args.dispensationId ??
      systemIdGenerator.generate()) as ULID;

    const result = await Dispensations.recordDispensation(
      {
        store: ctx.store,
        // No separate Responsável Técnico resolved in this surface yet, so the
        // segregation-of-duties guard against the RT is not engaged here.
        responsavelTecnicoId: null,
        dispenserRole: ctx.role === "DISPENSADOR" ? "DISPENSADOR" : "OTHER",
      },
      {
        type: "RecordDispensation",
        dispensationId,
        associationId: args.associationId as ULID,
        memberId: args.memberId as ULID,
        lotId: args.lotId as ULID,
        quantityG: qty.value,
        dispensedBy: ctx.userId as ULID,
        approvedBy: null,
        now: ctx.now,
      },
    );

    if (!result.ok) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: result.error.code,
              message: result.error.message,
              dispensationId,
            }),
          },
        ],
      };
    }

    const recorded = result.value.events.find(
      (e) => e.type === "DispensationRecorded",
    );

    // The decider may emit a rejection event (QuotaExceededAttempt |
    // LotInsufficientQuantity) instead of a recording. Those still append
    // (audit trail) but the dispensation did NOT happen — surface clearly.
    if (!recorded) {
      const rejection = result.value.events[0];
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "REJECTED",
              reason: rejection?.type ?? "UNKNOWN",
              dispensationId,
              memberId: args.memberId,
              lotId: args.lotId,
            }),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "RECORDED",
            dispensationId,
            associationId: ctx.associationId,
            memberId: args.memberId,
            lotId: args.lotId,
            quantityG: args.quantityG,
            dispensedBy: ctx.userId,
            justification: args.justification,
            emittedEvents: result.value.events.map((e) => e.type),
            nextStep: "get_member_quota",
            message:
              "Dispensação registrada. Cota do membro deduzida — consulte get_member_quota.",
          }),
        },
      ],
    };
  },
};
