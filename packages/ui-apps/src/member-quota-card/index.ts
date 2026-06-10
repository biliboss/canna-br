import type { AppManifest } from "../manifest.js";

export const memberQuotaCardManifest: AppManifest = {
  resourceUri: "ui://member-quota-card/app.html",
  id: "member-quota-card",
  title: "Member Quota",
  description:
    "Read-only card with member status, monthly quota cap, consumed gramas this month, and recent dispensations.",
  category: "read-only-card",
  riskLevel: 1,
  primaryToolName: "get_member_quota",
  secondaryToolNames: [] as const,
  htmlBundlePath: "dist/member-quota-card.html",
};
