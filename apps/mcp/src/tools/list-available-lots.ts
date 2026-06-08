import type { ULID } from "@canna/shared";
import type { ToolDefinition } from "../types.js";

interface Args {
  readonly associationId: string;
}

// v0.2.1 stub: lot streams are loaded individually by id; a real
// implementation will use the lot-list projection in @canna/read-models.
// For now we return an empty list with a documented contract so MCP hosts
// can wire the tool ahead of the projection landing.
export const listAvailableLots: ToolDefinition<Args> = {
  name: "list_available_lots",
  title: "Available Lots (FIFO)",
  description:
    "List lots in AVAILABLE status for the association, FIFO by released_at. Used by DispensationFormApp lot picker.",
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
    properties: {
      associationId: { type: "string", description: "ULID of the association" },
    },
    required: ["associationId"],
  },
  uiResourceUri: "ui://inventory-lot-picker/app.html",
  async handler(args, ctx) {
    void ctx;
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            associationId: args.associationId as ULID,
            lots: [],
            note:
              "v0.2.1 stub — projection lands with @canna/read-models. " +
              "Stream-by-stream loading via @canna/app-services Lots.loadLotState is supported per id.",
          }),
        },
      ],
    };
  },
};
