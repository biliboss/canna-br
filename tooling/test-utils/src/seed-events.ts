/**
 * Deterministic seed event log for canna-oss.
 *
 * Pure, side-effect-free: builds the ordered domain-event sequence that
 * populates a verifiable environment, using the typed factories from
 * `@canna/test-utils`. Re-evaluating produces a structurally identical log, so
 * projecting it (full-replay via `applyEventsToPg`) is idempotent.
 *
 * Scenario:
 *   - 1 association (implicit via TEST_IDS.association)
 *   - 3 members in distinct states: ACTIVE, PENDING, SUSPENDED
 *   - 1 inventory lot driven to RELEASED (available for dispensation)
 *   - 1 validated prescription for the ACTIVE member
 */
import type { DomainEvent, ULID } from "@canna/shared";

import {
  consentGranted,
  lotCreated,
  lotReleased,
  memberRegistered,
  memberSuspended,
  prescriptionValidated,
} from "./factories.js";

export const SEED_IDS = {
  memberActive: "01HZSEEDMEMBERACTIVE000001" as ULID,
  memberPending: "01HZSEEDMEMBERPENDING00001" as ULID,
  memberSuspended: "01HZSEEDMEMBERSUSPEND00001" as ULID,
  lot: "01HZSEEDLOT00000000000001" as ULID,
  prescription: "01HZSEEDPRESC0000000000001" as ULID,
} as const;

const at = (iso: string): Date => new Date(iso);

export const buildSeedEvents = (): readonly DomainEvent<string, unknown>[] => [
  // --- ACTIVE member: registered + consent granted ---
  memberRegistered(
    { memberId: SEED_IDS.memberActive },
    at("2026-06-01T09:00:00.000Z"),
  ),
  consentGranted(
    { memberId: SEED_IDS.memberActive, consentVersion: 1 },
    at("2026-06-01T09:05:00.000Z"),
  ),
  prescriptionValidated(
    {
      memberId: SEED_IDS.memberActive,
      prescriptionId: SEED_IDS.prescription,
    },
    at("2026-06-01T09:10:00.000Z"),
  ),

  // --- PENDING member: registered only (no consent) ---
  memberRegistered(
    { memberId: SEED_IDS.memberPending },
    at("2026-06-02T09:00:00.000Z"),
  ),

  // --- SUSPENDED member: registered + consent + suspended ---
  memberRegistered(
    { memberId: SEED_IDS.memberSuspended },
    at("2026-06-03T09:00:00.000Z"),
  ),
  consentGranted(
    { memberId: SEED_IDS.memberSuspended },
    at("2026-06-03T09:05:00.000Z"),
  ),
  memberSuspended(
    { memberId: SEED_IDS.memberSuspended },
    at("2026-06-03T10:00:00.000Z"),
  ),

  // --- RELEASED lot: created then released (available) ---
  lotCreated({ lotId: SEED_IDS.lot }, at("2026-06-01T08:00:00.000Z")),
  lotReleased({ lotId: SEED_IDS.lot }, at("2026-06-01T08:30:00.000Z")),
];
