import type { ToolDefinition } from "../types.js";

interface Args {
  readonly dispensationId: string;
}

export const getTraceabilityReport: ToolDefinition<Args> = {
  name: "generate_traceability_report",
  title: "Traceability Report",
  description:
    "Produce a member → prescription → lot → dispensation chain for audit. Rendered by TraceabilityTimelineApp.",
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
      dispensationId: { type: "string" },
    },
    required: ["dispensationId"],
  },
  uiResourceUri: "ui://traceability-timeline/app.html",
  async handler(args, ctx) {
    void ctx;
    // v0.2.1 stub: real implementation reads association stream + filters by
    // dispensationId, then assembles the timeline. Wire to read-models in
    // v0.2.1.x.
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            dispensationId: args.dispensationId,
            timeline: [],
            note: "v0.2.1 stub — full timeline lands with read-models.",
          }),
        },
      ],
    };
  },
};
