import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import type { ULID } from "@canna/shared";
import { Members } from "@canna/app-services";
import {
  applyEventsToPg,
  createPostgresStore,
  type AnyPgDatabase,
  type ReadModelQuery,
} from "@canna/read-models";

import {
  createRawPostgresEventStore,
  readAllEvents,
  wrapEmmettStore,
  type CannaEventStore,
} from "./index.js";
import type { PostgresEventStore as EmmettPgEventStore } from "@event-driven-io/emmett-postgresql";

/**
 * END-TO-END proof of the read-model loop against a REAL Postgres (testcontainers):
 *
 *   1. publish REAL domain events through the app-services (registerMember +
 *      grantConsent) into the Emmett-backed event store — they land in
 *      `emt_messages`;
 *   2. enumerate the WHOLE log with `readAllEvents()` (the global reader this
 *      card adds) and fold it into the read-model tables with `applyEventsToPg`;
 *   3. query the read model through the SAME async `ReadModelQuery` contract the
 *      MCP tools call (`getMemberByCpfHash` / `listMembersByStatus`) and assert
 *      it returns the REAL projected member (ACTIVE, right cpf hash) — not empty,
 *      not a stub;
 *   4. re-run the projection pass and assert the read model did NOT duplicate.
 *
 * This is the "query tools return real data" guarantee end-to-end. It SKIPS if
 * Docker is unavailable (CI without a docker daemon).
 */

const readModelMigration = fileURLToPath(
  new URL("../../read-models/migrations/0001-init.sql", import.meta.url),
);

const ulid = (s: string): ULID => s as unknown as ULID;

const ASSOC = ulid("assoc-e2e-1");
const MEMBER = ulid("member-e2e-1");
const CPF_HASH = "cpf-hash-e2e-deadbeef";

const dockerDisabled =
  process.env["CANNA_SKIP_PG_TESTS"] === "1" ||
  process.env["CI_NO_DOCKER"] === "1";

const dockerAvailable = (): boolean => {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

const dockerUp = !dockerDisabled && dockerAvailable();

if (!dockerUp && process.env["CANNA_REQUIRE_PG_TESTS"] === "1") {
  throw new Error(
    "[loop-e2e.spec] docker unavailable and CANNA_REQUIRE_PG_TESTS=1 — failing hard (unset to skip instead)",
  );
}

const startContainer = async (): Promise<StartedPostgreSqlContainer | null> => {
  try {
    return await new PostgreSqlContainer("postgres:16-alpine").start();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[loop-e2e] Docker unavailable, skipping suite: ${msg}`);
    return null;
  }
};

describe.skipIf(dockerDisabled || !dockerUp)("event -> projection -> query (real PG e2e)", () => {
  let pg: StartedPostgreSqlContainer | null = null;
  let rawStore: EmmettPgEventStore | null = null;
  let store: CannaEventStore | null = null;
  let pool: import("pg").Pool | null = null;
  let db: AnyPgDatabase | null = null;
  let query: ReadModelQuery | null = null;

  beforeAll(async () => {
    pg = await startContainer();
    if (pg === null) return;
    const url = pg.getConnectionUri();

    // Event store (Emmett owns its own schema, created on first append).
    // Use a single raw Emmett store we can close cleanly before stopping the
    // container — avoids dangling pools triggering 57P01 on teardown.
    rawStore = createRawPostgresEventStore(url);
    store = wrapEmmettStore(rawStore);

    // Read-model tables live in the SAME database (mirrors prod: one DATABASE_URL).
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: url });
    const sqlText = readFileSync(readModelMigration, "utf8");
    await pool.query(sqlText);
    const { drizzle } = await import("drizzle-orm/node-postgres");
    db = drizzle(pool) as unknown as AnyPgDatabase;
    query = createPostgresStore(db);
  }, 180_000);

  afterAll(async () => {
    // Close every connection pool BEFORE stopping the container so Postgres
    // doesn't terminate live backends (57P01).
    if (pool !== null) {
      try {
        await pool.end();
      } catch {
        /* already closed */
      }
    }
    if (rawStore !== null) {
      try {
        await rawStore.close();
      } catch {
        /* pool may already be torn down */
      }
    }
    if (pg !== null) await pg.stop();
  }, 60_000);

  it("publishes real events, projects them, and the query tool returns the real member", async () => {
    if (store === null || pool === null || query === null) {
      throw new Error("postgres container/read-model setup failed in beforeAll");
    }

    // 1. REAL events via the app-service command handlers.
    const reg = await Members.registerMember(store, {
      type: "RegisterMember",
      memberId: MEMBER,
      associationId: ASSOC,
      cpfHash: CPF_HASH,
      registeredBy: ulid("admin-e2e"),
      now: new Date("2026-06-17T10:00:00.000Z"),
    });
    expect(reg.ok).toBe(true);

    const consent = await Members.grantConsent(store, {
      type: "GrantConsent",
      memberId: MEMBER,
      consentVersion: 2,
      grantedBy: ulid("admin-e2e"),
      now: new Date("2026-06-17T10:05:00.000Z"),
    });
    expect(consent.ok).toBe(true);

    // 2. GLOBAL enumeration (the reader this card adds) -> project to read model.
    const events = await readAllEvents(pool as unknown as Parameters<typeof readAllEvents>[0]);
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.map((e) => e.type)).toContain("MemberRegistered");
    expect(events.map((e) => e.type)).toContain("ConsentGranted");
    // ordering: registration before consent
    expect(events.findIndex((e) => e.type === "MemberRegistered")).toBeLessThan(
      events.findIndex((e) => e.type === "ConsentGranted"),
    );

    await applyEventsToPg(db!, events);

    // 3. Query through the SAME contract the MCP tools use — assert REAL data.
    const byCpf = await query.getMemberByCpfHash(CPF_HASH, ASSOC);
    expect(byCpf).toBeDefined();
    expect(byCpf?.memberId).toBe(MEMBER);
    expect(byCpf?.status).toBe("ACTIVE");
    expect(byCpf?.consentVersion).toBe(2);

    const active = await query.listMembersByStatus(ASSOC, "ACTIVE");
    expect(active.map((m) => m.memberId)).toContain(MEMBER);

    // 4. Idempotency: a second pass does NOT duplicate the member row.
    const eventsAgain = await readAllEvents(
      pool as unknown as Parameters<typeof readAllEvents>[0],
    );
    await applyEventsToPg(db!, eventsAgain);

    const all = await query.listMembersByStatus(ASSOC);
    expect(all.filter((m) => m.memberId === MEMBER)).toHaveLength(1);
  }, 60_000);
});
