import type { AppManifest } from "../manifest.js";

export const traceabilityTimelineManifest: AppManifest = {
  resourceUri: "ui://traceability-timeline/app.html",
  id: "traceability-timeline",
  title: "Traceability Timeline",
  description:
    "Horizontal timeline rendering member → prescription → lot → dispensation chain for audit.",
  category: "timeline",
  riskLevel: 1,
  primaryToolName: "generate_traceability_report",
  secondaryToolNames: [] as const,
  htmlBundlePath: "dist/traceability-timeline.html",
};
