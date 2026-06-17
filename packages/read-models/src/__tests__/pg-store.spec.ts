import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { createPostgresStore, type ReadModelQuery } from "../pg-store.js";

/**
 * Adapter test against a REAL Postgres engine (pglite, embedded PG16 in WASM) —
 * no driver mocking. We bootstrap the canonical 0001-init.sql schema, seed rows
 * with raw SQL, then assert every ReadModelQuery method returns real data.
 *
 * pgcrypto is not bundled in pglite, but gen_random_uuid() is built into PG13+,
 * so the CREATE EXTENSION line is stripped (the audit_log default still works).
 */
const migrationPath = fileURLToPath(
  new URL("../../migrations/0001-init.sql", import.meta.url),
);

let pg: PGlite;
let store: ReadModelQuery;

beforeAll(async () => {
  pg = new PGlite();
  const sql = readFileSync(migrationPath, "utf8").replace(
    /CREATE EXTENSION[^\n]*\n/,
    "",
  );
  await pg.exec(sql);

  // Seed: two members in assoc-1 (one ACTIVE, one SUSPENDED), one in assoc-2.
  await pg.exec(`
    INSERT INTO members (member_id, association_id, cpf_hash, status, consent_version, created_at, updated_at) VALUES
      ('m1', 'assoc-1', 'hashA', 'ACTIVE', 2, now(), now()),
      ('m2', 'assoc-1', 'hashB', 'SUSPENDED', 1, now(), now()),
      ('m3', 'assoc-2', 'hashC', 'ACTIVE', 1, now(), now());

    INSERT INTO member_quota (member_id, month, consumed_g) VALUES
      ('m1', '2026-06', 12.500);

    INSERT INTO inventory_lots (lot_id, association_id, product_sku, status, initial_quantity_g, current_quantity_g, produced_at, expires_at) VALUES
      ('lotR', 'assoc-1', 'SKU-1', 'RELEASED', 100.000, 80.000, now(), now()),
      ('lotQ', 'assoc-1', 'SKU-2', 'QUARANTINED', 50.000, 50.000, now(), now()),
      ('lotR2', 'assoc-2', 'SKU-3', 'RELEASED', 30.000, 30.000, now(), now());
  `);

  const db = drizzle(pg);
  store = createPostgresStore(db);
});

describe("createPostgresStore (pglite)", () => {
  it("getMemberByCpfHash returns the row scoped to the association", async () => {
    const row = await store.getMemberByCpfHash("hashA", "assoc-1");
    expect(row?.memberId).toBe("m1");
    expect(row?.status).toBe("ACTIVE");
    expect(row?.consentVersion).toBe(2);
  });

  it("getMemberByCpfHash isolates by association (no cross-tenant leak)", async () => {
    // hashA belongs to assoc-1; querying under assoc-2 must miss.
    expect(await store.getMemberByCpfHash("hashA", "assoc-2")).toBeUndefined();
    expect(await store.getMemberByCpfHash("nope", "assoc-1")).toBeUndefined();
  });

  it("listMembersByStatus returns all members for an association when unfiltered", async () => {
    const rows = await store.listMembersByStatus("assoc-1");
    expect(rows.map((r) => r.memberId).sort()).toEqual(["m1", "m2"]);
  });

  it("listMembersByStatus filters by status", async () => {
    const active = await store.listMembersByStatus("assoc-1", "ACTIVE");
    expect(active.map((r) => r.memberId)).toEqual(["m1"]);
    const suspended = await store.listMembersByStatus("assoc-1", "SUSPENDED");
    expect(suspended.map((r) => r.memberId)).toEqual(["m2"]);
  });

  it("getMemberQuota returns consumed grams for the month", async () => {
    const quota = await store.getMemberQuota("m1", "2026-06");
    expect(quota?.consumedG).toBe("12.500");
    expect(await store.getMemberQuota("m1", "2026-07")).toBeUndefined();
  });

  it("listAvailableLots returns only RELEASED lots for the association", async () => {
    const lots = await store.listAvailableLots("assoc-1");
    expect(lots.map((l) => l.lotId)).toEqual(["lotR"]);
    expect(lots[0]?.currentQuantityG).toBe("80.000");
  });
});
