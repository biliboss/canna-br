import type { Dispensation, Inventory, Membership } from "@canna/domain";
import type { DomainEvent } from "@canna/shared";

import { projectAudit, auditLogEventId } from "./projections/audit-log.js";
import { projectDispensation } from "./projections/dispensations.js";
import { projectLot } from "./projections/inventory.js";
import { projectQuota } from "./projections/member-quota.js";
import { projectMember, projectPrescription } from "./projections/members.js";
import type { ReadModelStore } from "./store.js";

/**
 * Union of every domain event the read-models package knows how to project.
 *
 * Keeps `apply.ts` strongly typed without leaking concrete payloads through
 * the public API — callers pass `DomainEvent<string, unknown>[]` and the
 * router downcasts to the relevant union per projection.
 */
export type ProjectableEvent =
  | Membership.MemberEvent
  | Inventory.InventoryEvent
  | Dispensation.DispensationEvent;

interface ApplyEventsOptions {
  /** Stable clock used to stamp `audit_log.recorded_at`. Defaults to event's `occurredAt`. */
  readonly recordedAt?: (event: DomainEvent<string, unknown>) => Date;
}

/**
 * Driver: apply each event to all relevant projections plus the audit log.
 *
 * Idempotency contract:
 *  - The audit log uses a deterministic id derived from
 *    (eventType, streamId, occurredAt, seq). Re-applying the same input array
 *    is a no-op for the audit log.
 *  - When an event is already present in the audit log, projections are NOT
 *    re-executed — so accumulators like `member_quota` cannot double-count
 *    and snapshot projections converge on the same final state.
 *
 * NOTE: callers MUST pass the events in their original emission order. The
 * `seq` index is taken from the array position to ensure stable keys across
 * runs.
 */
export const applyEvents = (
  events: readonly DomainEvent<string, unknown>[],
  store: ReadModelStore,
  options: ApplyEventsOptions = {},
): void => {
  const recordedAt = options.recordedAt ?? ((event) => event.occurredAt);

  events.forEach((event, seq) => {
    const auditId = auditLogEventId(event.type, event.streamId, event.occurredAt, seq);

    // Skip every projection (including the audit log) if we've already
    // processed this exact event — guarantees idempotency on re-apply.
    if (store.hasAuditLog(auditId)) {
      return;
    }

    store.appendAuditLog(projectAudit(event, seq, recordedAt(event)));

    routeMembership(event, store);
    routePrescription(event, store);
    routeLot(event, store);
    routeDispensation(event, store);
    routeQuota(event, store);
  });
};

const routeMembership = (
  event: DomainEvent<string, unknown>,
  store: ReadModelStore,
): void => {
  const payload = event.payload as { memberId?: string };
  const memberId = payload?.memberId;
  if (!memberId) return;

  const prev = store.getMember(memberId) ?? null;
  const next = projectMember(prev, event);
  if (next) store.upsertMember(next);
};

const routePrescription = (
  event: DomainEvent<string, unknown>,
  store: ReadModelStore,
): void => {
  const payload = event.payload as { prescriptionId?: string };
  const prescriptionId = payload?.prescriptionId;
  if (!prescriptionId) return;

  const prev = store.getPrescription(prescriptionId) ?? null;
  const next = projectPrescription(prev, event);
  if (next) store.upsertPrescription(next);
};

const routeLot = (
  event: DomainEvent<string, unknown>,
  store: ReadModelStore,
): void => {
  const payload = event.payload as { lotId?: string };
  const lotId = payload?.lotId;
  if (!lotId) return;

  const prev = store.getInventoryLot(lotId) ?? null;
  const next = projectLot(prev, event);
  if (next) store.upsertInventoryLot(next);
};

const routeDispensation = (
  event: DomainEvent<string, unknown>,
  store: ReadModelStore,
): void => {
  if (event.type !== "DispensationRecorded") return;
  const payload = event.payload as { dispensationId?: string };
  const dispensationId = payload?.dispensationId;
  if (!dispensationId) return;

  const prev = store.getDispensation(dispensationId) ?? null;
  const next = projectDispensation(prev, event);
  if (next) store.upsertDispensation(next);
};

const routeQuota = (
  event: DomainEvent<string, unknown>,
  store: ReadModelStore,
): void => {
  if (event.type !== "MemberQuotaConsumed") return;
  const payload = event.payload as { memberId?: string; month?: string };
  const memberId = payload?.memberId;
  const month = payload?.month;
  if (!memberId || !month) return;

  const prev = store.getMemberQuota(memberId, month) ?? null;
  const next = projectQuota(prev, event);
  if (next) store.upsertMemberQuota(next);
};
