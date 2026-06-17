import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { beforeEach, describe, expect, it } from "vitest";

import { applyEventsToPg } from "@canna/read-models";
import type { AnyPgDatabase } from "@canna/read-models";

import { SEED_IDS, buildSeedEvents } from "./seed-events.js";

/**
 * Determinism PROOF for `pnpm db:seed` against a REAL Postgres engine (pglite,
 * embedded PG16 WASM) — mirrors the wave.4 `pg-projector.spec.ts` harness.
 *
 * Bootstraps the canonical schema, projects the seed event log, then queries
 * via RAW SQL (the card's `get_members_by_status` / `listAvailableLots` are
 * illustrative — no such functions exist; the read path is SQL over the
 * projected tables) and re-applies to prove idempotency.
 */
const migrationPath = fileURLToPath(
  new URL(
    "../../../packages/read-models/migrations/0001-init.sql",
    import.meta.url,
  ),
);

let pg: PGlite;
let db: AnyPgDatabase;

beforeEach(async () => {
  pg = new PGlite();
  const sqlText = readFileSync(migrationPath, "utf8").replace(
    /CREATE EXTENSION[^\n]*\n/,
    "",
  );
  await pg.exec(sqlText);
  db = drizzle(pg) as unknown as AnyPgDatabase;
});

describe("deterministic seed (pglite)", () => {
  it("projects members in every seeded status", async () => {
    await applyEventsToPg(db, buildSeedEvents());

    const byStatus = await pg.query<{ status: string; n: number }>(
      "SELECT status, count(*)::int AS n FROM members GROUP BY status ORDER BY status",
    );
    const map = Object.fromEntries(byStatus.rows.map((r) => [r.status, r.n]));
    expect(map).toEqual({ ACTIVE: 1, PENDING_CONSENT: 1, SUSPENDED: 1 });

    const active = await pg.query<{ member_id: string }>(
      "SELECT member_id FROM members WHERE status = 'ACTIVE'",
    );
    expect(active.rows[0]?.member_id).toBe(SEED_IDS.memberActive);
  });

  it("projects a RELEASED (available) lot", async () => {
    await applyEventsToPg(db, buildSeedEvents());

    const released = await pg.query<{ lot_id: string; status: string }>(
      "SELECT lot_id, status FROM inventory_lots WHERE status = 'RELEASED'",
    );
    expect(released.rows).toHaveLength(1);
    expect(released.rows[0]?.lot_id).toBe(SEED_IDS.lot);
  });

  it("projects the validated prescription", async () => {
    await applyEventsToPg(db, buildSeedEvents());

    const presc = await pg.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM prescriptions WHERE member_id = '${SEED_IDS.memberActive}'`,
    );
    expect(presc.rows[0]?.n).toBe(1);
  });

  it("is deterministic + idempotent: re-seeding does not duplicate", async () => {
    await applyEventsToPg(db, buildSeedEvents());
    await applyEventsToPg(db, buildSeedEvents()); // replay

    const members = await pg.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM members",
    );
    expect(members.rows[0]?.n).toBe(3);

    const lots = await pg.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM inventory_lots",
    );
    expect(lots.rows[0]?.n).toBe(1);
  });
});
