/** canna-br — admin MCP-App prototype registry (generated from the mcp-app-base kit). */
import type { WidgetDef } from "./kit/types.js";

import { def as memberLifecycleBoard } from "./widgets/admin/member-lifecycle-board.js";
import { def as quotaConsumptionScorecard } from "./widgets/admin/quota-consumption-scorecard.js";
import { def as dispensationThroughputBar } from "./widgets/admin/dispensation-throughput-bar.js";
import { def as inventoryLotStatusBoard } from "./widgets/admin/inventory-lot-status-board.js";
import { def as sngpcSubmissionAging } from "./widgets/admin/sngpc-submission-aging.js";
import { def as prescriptionExpiryScatter } from "./widgets/admin/prescription-expiry-scatter.js";
import { def as inventoryLotPicker } from "./widgets/admin/inventory-lot-picker.js";
import { def as memberQuotaCard } from "./widgets/admin/member-quota-card.js";
import { def as dispensationForm } from "./widgets/admin/dispensation-form.js";
import { def as traceabilityTimeline } from "./widgets/admin/traceability-timeline.js";
import { def as onboardingCredentialSetup } from "./widgets/admin/onboarding-credential-setup.js";
import { def as memberRegistration } from "./widgets/admin/member-registration.js";
// <mcp-apps:imports> — `library new` inserts new app imports above this line

export const WIDGETS: WidgetDef[] = [
  memberLifecycleBoard,
  quotaConsumptionScorecard,
  dispensationThroughputBar,
  inventoryLotStatusBoard,
  sngpcSubmissionAging,
  prescriptionExpiryScatter,
  inventoryLotPicker,
  memberQuotaCard,
  dispensationForm,
  traceabilityTimeline,
  // onboarding
  onboardingCredentialSetup,
  // membership
  memberRegistration,
  // <mcp-apps:widgets> — `library new` inserts new app entries above this line
];

export const WIDGETS_BY_NAME: Record<string, WidgetDef> = Object.fromEntries(
  WIDGETS.map((w) => [w.name, w]),
);
export const WIDGETS_BY_SLUG: Record<string, WidgetDef> = Object.fromEntries(
  WIDGETS.map((w) => [w.resourceName, w]),
);
