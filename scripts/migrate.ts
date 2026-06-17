/**
 * `pnpm db:migrate` — apply the read-model schema to a local Postgres.
 *
 *   DATABASE_URL=postgres://... pnpm db:migrate
 *
 * Runs the canonical migration `packages/read-models/migrations/0001-init.sql`.
 * Idempotent: the migration uses CREATE TABLE IF NOT EXISTS / CREATE INDEX IF
 * NOT EXISTS. (The CREATE RULE statements are not guarded, so re-running an
 * already-migrated DB will error on the rules — expected for a fresh-DB step.)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const migrationPath = fileURLToPath(
  new URL(
    "../packages/read-models/migrations/0001-init.sql",
    import.meta.url,
  ),
);

const main = async (): Promise<void> => {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    console.error(
      "✗ DATABASE_URL not set. Example:\n" +
        "  DATABASE_URL=postgres://localhost:5432/canna pnpm db:migrate",
    );
    process.exit(1);
  }
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: url });
  try {
    const sqlText = readFileSync(migrationPath, "utf8");
    await pool.query(sqlText);
    console.log("✓ migrated read-model schema (0001-init.sql)");
  } finally {
    await pool.end();
  }
};

main().catch((err: unknown) => {
  console.error("✗ migrate failed:", err);
  process.exit(1);
});
