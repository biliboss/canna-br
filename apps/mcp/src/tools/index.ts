import type { ToolDefinition } from "../types.js";
import { getMemberQuota } from "./get-member-quota.js";
import { listAvailableLots } from "./list-available-lots.js";
import { getTraceabilityReport } from "./get-traceability-report.js";
import { draftDispensation } from "./draft-dispensation.js";
import { requestRecordDispensation } from "./request-record-dispensation.js";

type AnyTool = ToolDefinition<Record<string, unknown>>;

export const allTools: readonly AnyTool[] = [
  // Nível 1 — read-only
  getMemberQuota as unknown as AnyTool,
  listAvailableLots as unknown as AnyTool,
  getTraceabilityReport as unknown as AnyTool,
  // Nível 2 — draft (no state mutation)
  draftDispensation as unknown as AnyTool,
  // Nível 3 — write with approval (PendingAction)
  requestRecordDispensation as unknown as AnyTool,
];
