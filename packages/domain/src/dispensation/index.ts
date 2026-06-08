// v0.2.0 spike — Dispensation use case to be implemented.
// RecordDispensation -> single atomic append emitting:
//   DispensationRecorded + MemberQuotaConsumed + LotQuantityDeducted
// Rejection events: QuotaExceededAttempt, LotInsufficientQuantity.
// Stream: association:{associationId}:dispensations (cf. ADR-001 spike gate).
// See: docs/domain/event-storming, docs/domain/invariants (INV-D2), ADR-001.
export {};
