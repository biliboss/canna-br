import type { ToolDefinition } from "../types.js";
import { getMemberQuota } from "./get-member-quota.js";
import { getMembersByStatus } from "./get-members-by-status.js";
import { findMemberByCpf } from "./find-member-by-cpf.js";
import { listAvailableLots } from "./list-available-lots.js";
import { getTraceabilityReport } from "./get-traceability-report.js";
import { draftDispensation } from "./draft-dispensation.js";
import { requestRecordDispensation } from "./request-record-dispensation.js";
import { registerMember } from "./register-member.js";
import { grantConsent } from "./grant-consent.js";
import { validatePrescription } from "./validate-prescription.js";
import { suspendMember } from "./suspend-member.js";
import { reinstateMember } from "./reinstate-member.js";
import { revokeConsent } from "./revoke-consent.js";
import { anonymizeMember } from "./anonymize-member.js";

type AnyTool = ToolDefinition<Record<string, unknown>>;

export const allTools: readonly AnyTool[] = [
  // Nível 1 — read-only
  getMemberQuota as unknown as AnyTool,
  getMembersByStatus as unknown as AnyTool,
  findMemberByCpf as unknown as AnyTool,
  listAvailableLots as unknown as AnyTool,
  getTraceabilityReport as unknown as AnyTool,
  // Nível 2 — draft (no state mutation)
  draftDispensation as unknown as AnyTool,
  // Nível 3 — write
  registerMember as unknown as AnyTool,
  grantConsent as unknown as AnyTool,
  requestRecordDispensation as unknown as AnyTool,
  validatePrescription as unknown as AnyTool,
  suspendMember as unknown as AnyTool,
  reinstateMember as unknown as AnyTool,
  revokeConsent as unknown as AnyTool,
  anonymizeMember as unknown as AnyTool,
];
