import type { AppManifest } from "./manifest.js";
import { memberQuotaCardManifest } from "./member-quota-card/index.js";
import { traceabilityTimelineManifest } from "./traceability-timeline/index.js";
import { dispensationFormManifest } from "./dispensation-form/index.js";
// NOTE: member-lifecycle-board is intentionally NOT registered. Its manifest
// (./member-lifecycle-board/index.ts) is an aggregate dashboard over ALL
// members grouped by MemberStatus, but no backing MCP tool exists: the
// CannaEventStore interface exposes only per-stream ops (no listStreams /
// cross-member projection / read-model), and get_member_quota is a
// single-member tool with a different payload shape. Its manifest carries an
// `__unavailable__:` primaryToolName sentinel so it can never advertise a
// phantom tool. Re-add here (and swap the sentinel for a real
// `get_member_lifecycle` primaryToolName) once a cross-member lifecycle
// read-model + tool ship. Advertising it now would point at a missing tool.

export const allManifests: readonly AppManifest[] = [
  memberQuotaCardManifest,
  traceabilityTimelineManifest,
  dispensationFormManifest,
];

const byUri = new Map<string, AppManifest>(
  allManifests.map((m) => [m.resourceUri, m]),
);

export const manifestByUri = (uri: string): AppManifest | undefined =>
  byUri.get(uri);
