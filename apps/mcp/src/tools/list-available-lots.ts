import type { ToolDefinition } from "../types.js";

/**
 * list_available_lots — Nível 1 (read-only).
 *
 * Returns the lots in RELEASED status for the caller's association, FIFO by
 * producedAt (oldest first — first-expiry-first-out picking). Powers the
 * DispensationFormApp lot picker widget.
 *
 * Design:
 *  - Scoped to ctx.associationId — no cross-tenant data.
 *  - Queries the async read-model (`listAvailableLots`), which already filters
 *    to status=RELEASED at the storage layer (pg `WHERE status = 'RELEASED'`,
 *    in-memory equivalent).
 *  - readModelStore is required; returns READ_MODEL_STORE_UNAVAILABLE if absent.
 */
type Args = Record<string, never>;

export const listAvailableLots: ToolDefinition<Args> = {
  name: "list_available_lots",
  title: "Available Lots (FIFO)",
  description:
    "Lista os lotes em status RELEASED da associação, FIFO por data de produção (mais antigo primeiro). Retorna lotId, productSku, quantidade atual/inicial em gramas e validade. Usado pelo lot picker do DispensationFormApp. Role: DISPENSADOR | RT | DIRETORIA | DPO | AUDITOR.",
  riskLevel: 1,
  allowedRoles: [
    "DISPENSADOR",
    "RESPONSAVEL_TECNICO",
    "DIRETORIA",
    "DPO",
    "AUDITOR",
  ],
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
  uiResourceUri: "ui://inventory-lot-picker/app.html",
  async handler(_args, ctx) {
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

    if (ctx.readModelStore === undefined) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "READ_MODEL_STORE_UNAVAILABLE",
              message:
                "O store de leitura não está disponível neste deployment. Contate o administrador.",
            }),
          },
        ],
      };
    }

    const rows = await ctx.readModelStore.listAvailableLots(ctx.associationId);

    // FIFO by producedAt (oldest first), stable on lotId for deterministic order.
    const toIso = (d: Date | string): string =>
      d instanceof Date ? d.toISOString() : String(d);
    const toMs = (d: Date | string): number =>
      d instanceof Date ? d.getTime() : new Date(d).getTime();

    const lots = [...rows]
      .sort((a, b) => {
        const delta = toMs(a.producedAt) - toMs(b.producedAt);
        return delta !== 0 ? delta : a.lotId.localeCompare(b.lotId);
      })
      .map((row) => ({
        lotId: row.lotId,
        productSku: row.productSku,
        status: row.status,
        initialQuantityG: row.initialQuantityG,
        currentQuantityG: row.currentQuantityG,
        producedAt: toIso(row.producedAt),
        expiresAt: toIso(row.expiresAt),
      }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            associationId: ctx.associationId,
            totalCount: lots.length,
            lots,
            viewerRole: ctx.role,
          }),
        },
      ],
    };
  },
};
