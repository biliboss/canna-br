-- canna-oss read-models initial schema.
-- Owned exclusively by @canna/read-models — the event store (Emmett) lives in
-- @canna/event-store and is never touched by Drizzle.

-- Required for gen_random_uuid() on the audit_log primary key.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Members projection ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS "members" (
  "member_id" TEXT PRIMARY KEY,
  "association_id" TEXT NOT NULL,
  "cpf_hash" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "consent_version" INTEGER,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS "members_association_idx" ON "members" ("association_id");

-- Prescriptions projection ----------------------------------------------------
CREATE TABLE IF NOT EXISTS "prescriptions" (
  "prescription_id" TEXT PRIMARY KEY,
  "member_id" TEXT NOT NULL,
  "physician_crm" TEXT NOT NULL,
  "valid_from" TIMESTAMPTZ NOT NULL,
  "valid_until" TIMESTAMPTZ NOT NULL,
  "monthly_quota_g" NUMERIC(12, 3) NOT NULL,
  "validated_at" TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS "prescriptions_member_idx" ON "prescriptions" ("member_id");

-- Member monthly quota accumulator -------------------------------------------
CREATE TABLE IF NOT EXISTS "member_quota" (
  "member_id" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "consumed_g" NUMERIC(12, 3) NOT NULL,
  PRIMARY KEY ("member_id", "month")
);

-- Inventory lots projection ---------------------------------------------------
CREATE TABLE IF NOT EXISTS "inventory_lots" (
  "lot_id" TEXT PRIMARY KEY,
  "association_id" TEXT NOT NULL,
  "product_sku" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "initial_quantity_g" NUMERIC(12, 3) NOT NULL,
  "current_quantity_g" NUMERIC(12, 3) NOT NULL,
  "produced_at" TIMESTAMPTZ NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS "inventory_lots_association_idx" ON "inventory_lots" ("association_id");
CREATE INDEX IF NOT EXISTS "inventory_lots_status_idx" ON "inventory_lots" ("status");

-- Dispensations projection ----------------------------------------------------
CREATE TABLE IF NOT EXISTS "dispensations" (
  "dispensation_id" TEXT PRIMARY KEY,
  "association_id" TEXT NOT NULL,
  "member_id" TEXT NOT NULL,
  "lot_id" TEXT NOT NULL,
  "prescription_id" TEXT NOT NULL,
  "quantity_g" NUMERIC(12, 3) NOT NULL,
  "dispensed_by" TEXT NOT NULL,
  "approved_by" TEXT,
  "dispensed_at" TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS "dispensations_member_idx" ON "dispensations" ("member_id");
CREATE INDEX IF NOT EXISTS "dispensations_lot_idx" ON "dispensations" ("lot_id");

-- Append-only audit log -------------------------------------------------------
CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_type" TEXT NOT NULL,
  "stream_id" TEXT NOT NULL,
  "occurred_at" TIMESTAMPTZ NOT NULL,
  "payload" JSONB NOT NULL,
  "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "audit_log_stream_idx" ON "audit_log" ("stream_id");
CREATE INDEX IF NOT EXISTS "audit_log_event_type_idx" ON "audit_log" ("event_type");
CREATE INDEX IF NOT EXISTS "audit_log_occurred_at_idx" ON "audit_log" ("occurred_at");

-- LGPD / RDC 1.014 compliance: lock audit_log to insert-only at the DB level.
-- Applications can INSERT but UPDATE/DELETE are silently no-op'd by the planner.
CREATE RULE audit_log_no_update AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE RULE audit_log_no_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;
