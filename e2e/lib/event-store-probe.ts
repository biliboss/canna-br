/**
 * Direct event-store probe for the wave.8 journey e2es — reads the Emmett
 * event store (`emt_streams_emt_default.stream_position` = number of appended
 * events for a stream) to assert audit/append-only behaviour that no MCP READ
 * tool exposes locally (generate_traceability_report is a v0.2.1 stub, and the
 * `audit_log` read-model is only filled by the out-of-band projector).
 *
 * Talks to the LOCAL harness Postgres via `docker exec` so it needs no `pg`
 * dependency resolvable from the repo root. Only meaningful against the local
 * seeded stack (e2e/lib/local-mcp-harness.sh); skips (returns -1) when the
 * container is absent — e.g. a prod run — so the suite degrades instead of
 * failing on an environment mismatch.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const PG_CONTAINER = process.env.CANNA_E2E_PG_CONTAINER ?? "canna-e2e-pg";

async function psqlScalar(sql: string): Promise<string | undefined> {
  try {
    const { stdout } = await exec("docker", [
      "exec",
      PG_CONTAINER,
      "psql",
      "-U",
      "canna",
      "-d",
      "canna",
      "-tAc",
      sql,
    ]);
    return stdout.trim();
  } catch {
    return undefined; // container absent (prod run) — caller treats as skip
  }
}

/** Event count for a member's stream (stream_position). -1 ⇒ probe unavailable. */
export async function streamCountForMember(memberId: string): Promise<number> {
  const out = await psqlScalar(
    `select coalesce(max(stream_position),0) from emt_streams_emt_default where stream_id = 'member:${memberId}'`,
  );
  if (out === undefined) return -1;
  return Number(out);
}

/** Total event count across all dispensation streams. -1 ⇒ probe unavailable. */
export async function dispensationEventCount(): Promise<number> {
  const out = await psqlScalar(
    `select coalesce(sum(stream_position),0) from emt_streams_emt_default where stream_id like 'association:%:dispensations'`,
  );
  if (out === undefined) return -1;
  return Number(out);
}

/** True when the local harness Postgres is reachable (else prod/no-container). */
export async function probeAvailable(): Promise<boolean> {
  return (await psqlScalar("select 1")) === "1";
}
