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
 * Nível 3 — WRITE. RDC 1.014 Step 1 (REQUEST). A DISPENSADOR *requests* a
 * dispensation: loads Member context, runs the `decideRequest` decider, and
 * appends a single `DispensationRequested` event to the association stream via
 * `Dispensations.requestDispensation`. This does NOT consume quota nor deduct
 * inventory — the dispensation stays PENDING until a DISTINCT approver
 * (RESPONSAVEL_TECNICO | DIRETORIA) calls `approve_dispensation`. Segregation
 * of duties (RDC 1.014) is enforced at approval time by comparing the stored
 * requester identity against the approver — the requester can NEVER approve
 * their own request.
 */
export const requestRecordDispensation: ToolDefinition<Args> = {
  name: "request_record_dispensation",
  title: "Request Dispensation (pending approval)",
  description:
    "RDC 1.014 — SOLICITA uma dispensação (passo 1 de 2). Registra um " +
    "DispensationRequested PENDENTE: NÃO consome cota nem deduz estoque. " +
    "A dispensação só é efetivada quando um aprovador DISTINTO " +
    "(RESPONSAVEL_TECNICO ou DIRETORIA) chamar approve_dispensation. " +
    "Segregação de função: o solicitante não pode aprovar a própria. " +
    "Role: DISPENSADOR.",
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

    const result = await Dispensations.requestDispensation(
      {
        store: ctx.store,
        dispenserRole: ctx.role === "DISPENSADOR" ? "DISPENSADOR" : "OTHER",
      },
      {
        type: "RequestDispensation",
        dispensationId,
        associationId: args.associationId as ULID,
        memberId: args.memberId as ULID,
        lotId: args.lotId as ULID,
        quantityG: qty.value,
        requestedBy: ctx.userId as ULID,
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

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            status: "PENDING_APPROVAL",
            dispensationId,
            associationId: ctx.associationId,
            memberId: args.memberId,
            lotId: args.lotId,
            quantityG: args.quantityG,
            requestedBy: ctx.userId,
            justification: args.justification,
            emittedEvents: result.value.events.map((e) => e.type),
            nextStep: "approve_dispensation",
            message:
              "Dispensação SOLICITADA e pendente de aprovação (RDC 1.014). " +
              "Cota NÃO foi consumida. Um aprovador distinto " +
              "(RESPONSAVEL_TECNICO ou DIRETORIA) deve chamar approve_dispensation " +
              `com dispensationId=${dispensationId}. O próprio solicitante não pode aprovar.`,
          }),
        },
      ],
    };
  },
};
