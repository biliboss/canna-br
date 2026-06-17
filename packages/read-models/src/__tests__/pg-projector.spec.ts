import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { DomainEvent, QuantityGrams } from "@canna/shared";

import { applyEventsToPg, deterministicAuditUuid } from "../pg-projector.js";
import type { AnyPgDatabase } from "../pg-store.js";

/**
 * Integration test against a REAL Postgres engine (pglite, embedded PG16 WASM).
 * Bootstraps the canonical 0001-init.sql schema, applies a domain-event
 * sequence through the projector, then re-applies the SAME sequence to PROVE
 * idempotency (no double-count, no duplicate audit rows).
 */
const migrationPath = fileURLToPath(
  new URL("../../migrations/0001-init.sql", import.meta.url),
);

let pg: PGlite;
let db: AnyPgDatabase;

const g = (n: number): QuantityGrams => n as QuantityGrams;

// MemberRegistered -> ConsentGranted -> 2x MemberQuotaConsumed (same month).
const events: DomainEvent<string, unknown>[] = [
  {
    type: "MemberRegistered",
    version: 1,
    streamId: "member-m1",
    occurredAt: new Date("2026-06-01T10:00:00.000Z"),
    payload: {
      memberId: "m1",
      associationId: "assoc-1",
      cpfHash: "hashA",
      registeredBy: "admin",
    },
  },
  {
    type: "ConsentGranted",
    version: 1,
    streamId: "member-m1",
    occurredAt: new Date("2026-06-01T10:05:00.000Z"),
    payload: { memberId: "m1", consentVersion: 3, grantedBy: "admin" },
  },
  {
    type: "MemberQuotaConsumed",
    version: 1,
    streamId: "dispensation-d1",
    occurredAt: new Date("2026-06-10T12:00:00.000Z"),
    payload: {
      memberId: "m1",
      dispensationId: "d1",
      month: "2026-06",
      quantityG: g(10),
      quotaBeforeG: g(0),
      quotaAfterG: g(10),
      consumedBy: "disp",
    },
  },
  {
    type: "MemberQuotaConsumed",
    version: 1,
    streamId: "dispensation-d2",
    occurredAt: new Date("2026-06-20T12:00:00.000Z"),
    payload: {
      memberId: "m1",
      dispensationId: "d2",
      month: "2026-06",
      quantityG: g(5),
      quotaBeforeG: g(10),
      quotaAfterG: g(15),
      consumedBy: "disp",
    },
  },
];

beforeEach(async () => {
  pg = new PGlite();
  const sqlText = readFileSync(migrationPath, "utf8").replace(
    /CREATE EXTENSION[^\n]*\n/,
    "",
  );
  await pg.exec(sqlText);
  db = drizzle(pg) as unknown as AnyPgDatabase;
});

describe("applyEventsToPg (pglite)", () => {
  it("projects members and member_quota from the event log", async () => {
    await applyEventsToPg(db, events);

    const member = await pg.query<{ status: string; consent_version: number }>(
      "SELECT status, consent_version FROM members WHERE member_id = 'm1'",
    );
    expect(member.rows[0]?.status).toBe("ACTIVE");
    expect(member.rows[0]?.consent_version).toBe(3);

    const quota = await pg.query<{ consumed_g: string }>(
      "SELECT consumed_g FROM member_quota WHERE member_id = 'm1' AND month = '2026-06'",
    );
    expect(quota.rows[0]?.consumed_g).toBe("15.000");

    const audit = await pg.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM audit_log",
    );
    expect(audit.rows[0]?.n).toBe(4);
  });

  it("is idempotent: re-applying the same events does NOT double-count or duplicate", async () => {
    await applyEventsToPg(db, events);
    await applyEventsToPg(db, events); // replay

    const quota = await pg.query<{ consumed_g: string }>(
      "SELECT consumed_g FROM member_quota WHERE member_id = 'm1' AND month = '2026-06'",
    );
    // SET-not-add + fold-from-empty => still 15, not 30.
    expect(quota.rows[0]?.consumed_g).toBe("15.000");

    const members = await pg.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM members",
    );
    expect(members.rows[0]?.n).toBe(1);

    const audit = await pg.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM audit_log",
    );
    // Deterministic v5 UUID + onConflictDoNothing => no duplicate audit rows.
    expect(audit.rows[0]?.n).toBe(4);

    void sql;
  });

  it("deterministicAuditUuid is stable and RFC-4122 v5 shaped", () => {
    const a = deterministicAuditUuid("evt::X::s::2026-06-01T00:00:00.000Z::0");
    const b = deterministicAuditUuid("evt::X::s::2026-06-01T00:00:00.000Z::0");
    expect(a).toBe(b);
    expect(a).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});
