import type { AppManifest } from "../manifest.js";

export const dispensationFormManifest: AppManifest = {
  resourceUri: "ui://dispensation-form/app.html",
  id: "dispensation-form",
  title: "Dispensation Form",
  description:
    "Interactive form with member picker + lot FIFO + quantity. Calls draft_dispensation for preview, then request_record_dispensation to create a PendingAction for RT approval.",
  category: "form",
  riskLevel: 3,
  primaryToolName: "draft_dispensation",
  secondaryToolNames: ["request_record_dispensation", "list_available_lots"] as const,
  htmlBundlePath: "dist/dispensation-form.html",
};
