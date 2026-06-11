import type { AppManifest } from "./manifest.js";
import { memberQuotaCardManifest } from "./member-quota-card/index.js";
import { traceabilityTimelineManifest } from "./traceability-timeline/index.js";
import { dispensationFormManifest } from "./dispensation-form/index.js";
import { memberLifecycleBoardManifest } from "./member-lifecycle-board/index.js";

export const allManifests: readonly AppManifest[] = [
  memberQuotaCardManifest,
  traceabilityTimelineManifest,
  dispensationFormManifest,
  memberLifecycleBoardManifest,
];

const byUri = new Map<string, AppManifest>(
  allManifests.map((m) => [m.resourceUri, m]),
);

export const manifestByUri = (uri: string): AppManifest | undefined =>
  byUri.get(uri);
