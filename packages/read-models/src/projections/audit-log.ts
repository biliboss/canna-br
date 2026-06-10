import type { DomainEvent } from "@canna/shared";

import type { NewAuditLogRow } from "../schema/audit-log.js";

/**
 * Build a deterministic UUID-shaped key for an event so re-applying the same
 * stream produces the same audit-log row id (idempotent insert).
 *
 * The shape is `evt-<eventType>-<streamId>-<isoTimestamp>-<seq>` — not a
 * canonical RFC4122 UUID, but a stable string id the in-memory store can use.
 * The SQL projection on Postgres relies on `gen_random_uuid()` default + a
 * unique constraint on (event_type, stream_id, occurred_at, seq) instead.
 */
export const auditLogEventId = (
  eventType: string,
  streamId: string,
  occurredAt: Date,
  seq: number,
): string => `evt::${eventType}::${streamId}::${occurredAt.toISOString()}::${seq}`;

/**
 * Pure projection of any DomainEvent into an `audit_log` row. The DB column
 * defaults handle `id` and `recordedAt` on the SQL side; for the in-memory
 * store we pre-compute a deterministic id so re-applying is idempotent.
 */
export const projectAudit = (
  event: DomainEvent<string, unknown>,
  seq: number,
  recordedAt: Date,
): NewAuditLogRow => ({
  id: auditLogEventId(event.type, event.streamId, event.occurredAt, seq),
  eventType: event.type,
  streamId: event.streamId,
  occurredAt: event.occurredAt,
  payload: event.payload as Record<string, unknown>,
  recordedAt,
});
