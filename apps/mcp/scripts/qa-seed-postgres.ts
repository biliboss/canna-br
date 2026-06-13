/**
 * QA Postgres seed — populates the REAL Postgres event store with the same
 * deterministic domain data as `qa-render-harness.ts`, so the live MCP server's
 * `get_member_quota` tool returns consumedG=7 / remainingG=23 for a known
 * member against the actual database (not the in-memory harness).
 *
 * The seed uses the EXACT same @canna/app-services command calls and the SAME
 * deterministic ULIDs as the keyless harness, so the IDs are predictable for a
 * chat-loop QA. The only difference from the harness is the event store target:
 * `createPostgresEventStore({ connectionString })` instead of in-memory.
 *
 * The quota tool (apps/mcp/src/tools/get-member-quota.ts) reads consumed grams
 * directly from the association event stream via
 * `Dispensations.loadMemberQuotaConsumed` — so seeding the event store via the
 * real command path is exactly what wires the tool. The Emmett/Pongo Postgres
 * adapter auto-creates its schema on first append.
 *
 * Run:
 *   DATABASE_URL=postgres://canna:cannadev@localhost:5432/canna \
 *     pnpm --filter @canna/mcp exec tsx scripts/qa-seed-postgres.ts
 *
 * A fresh Postgres volume = empty event store, so a single run is correct.
 * Re-running on a non-empty store will fail on the registerMember append
 * (stream already exists) — that's a safe, loud signal, not data corruption.
 */
import { createPostgresEventStore } from "@canna/event-store";
import { Members, Lots, Dispensations } from "@canna/app-services";
import { isOk, quantityGrams, type ULID } from "@canna/shared";

// --- Seed identities (mirror qa-render-harness.ts / server.spec.ts) --------
const ASSOC = "01HM0ASSOC0000000000000001" as ULID;
const MEMBER = "01HM0MEMBER000000000000001" as ULID;
const LOT = "01HM0LOT00000000000000001" as ULID;
const DISPENSER = "01HM0DISP0R000000000000001" as ULID;
const PHYSICIAN = "01HM0PHYS00000000000000001" as ULID;
const PRESC = "01HM0PRESC0000000000000001" as ULID;
const ACTOR = "01HM0ACTOR0000000000000001" as ULID;
const DISPENSATION = "01HM0DISP0000000000000001" as ULID;
const NOW = new Date("2026-06-08T12:00:00Z");
const MONTH = "2026-06";

const grams = (n: number) => {
  const r = quantityGrams(n);
  if (!isOk(r)) throw new Error(`bad grams: ${n}`);
  return r.value;
};

const main = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined || connectionString === "") {
    throw new Error("DATABASE_URL is required");
  }

  const store = createPostgresEventStore({ connectionString });

  // --- Seed via the REAL service commands (same as the harness) ------------
  await Members.registerMember(store, {
    type: "RegisterMember",
    memberId: MEMBER,
    associationId: ASSOC,
    cpfHash: "sha256:x",
    registeredBy: ACTOR,
    now: NOW,
  });
  await Members.grantConsent(store, {
    type: "GrantConsent",
    memberId: MEMBER,
    consentVersion: 1,
    grantedBy: ACTOR,
    now: NOW,
  });
  await Members.validatePrescription(store, {
    type: "ValidatePrescription",
    memberId: MEMBER,
    prescriptionId: PRESC,
    physicianCRM: "CRM/SP 123456",
    validFrom: new Date("2026-06-01T00:00:00Z"),
    validUntil: new Date("2026-12-01T00:00:00Z"),
    monthlyQuotaG: grams(30),
    validatedBy: PHYSICIAN,
    now: NOW,
  });
  await Lots.createLot(store, {
    type: "CreateLot",
    lotId: LOT,
    associationId: ASSOC,
    productSku: "CBD-FS",
    initialQuantityG: grams(100),
    origin: "INTERNAL_CULTIVATION",
    producedAt: new Date("2026-04-01T00:00:00Z"),
    expiresAt: new Date("2027-04-01T00:00:00Z"),
    createdBy: ACTOR,
    now: NOW,
  });
  await Lots.releaseLot(store, {
    type: "ReleaseLot",
    lotId: LOT,
    coaReference: "coa://lab/abc",
    releasedBy: ACTOR,
    now: NOW,
  });

  // Real dispensation: 7g against the 30g cap → consumedG=7, remainingG=23.
  const recorded = await Dispensations.recordDispensation(
    { store, responsavelTecnicoId: null, dispenserRole: "DISPENSADOR" },
    {
      type: "RecordDispensation",
      dispensationId: DISPENSATION,
      associationId: ASSOC,
      memberId: MEMBER,
      lotId: LOT,
      quantityG: grams(7),
      dispensedBy: DISPENSER,
      approvedBy: null,
      now: NOW,
    },
  );
  if (!isOk(recorded)) {
    throw new Error(`seed dispensation failed: ${JSON.stringify(recorded)}`);
  }

  // --- VERIFY against Postgres via the SAME path the tool uses -------------
  const consumed = await Dispensations.loadMemberQuotaConsumed(
    store,
    ASSOC,
    MEMBER,
    MONTH,
  );

  const line = "=".repeat(72);
  console.log(line);
  console.log("CANNA QA SEED — Postgres event store");
  console.log(line);
  console.log(`  associationId : ${ASSOC}`);
  console.log(`  memberId      : ${MEMBER}`);
  console.log(`  month         : ${MONTH}`);
  console.log(`  monthlyQuotaG : 30`);
  console.log(`  consumedG     : ${JSON.stringify(consumed)}`);
  console.log(`  remainingG    : ${30 - Number(consumed)}`);
  const ok = Number(consumed) === 7;
  console.log(`  consumedG===7 : ${ok ? "PASS" : "FAIL"}`);
  console.log(line);

  if (!ok) process.exit(1);
};

main().catch((e) => {
  console.error("[qa-seed-postgres] FATAL:", e);
  process.exit(1);
});
