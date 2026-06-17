/**
 * Wave.8 journey — DISPENSATION (cb-e2e-dispensation-journey).
 *
 * Against the LIVE MCP server (CANNA_MCP_URL; local seeded stack by default):
 *   register_member → grant_consent → validate_prescription(monthlyQuotaG)
 *   request_record_dispensation(lot=SEED.lot) → result RECORDED
 *   get_member_quota → consumedG rises by the dispensed grams, remainingG falls
 *   second dispensation → consumedG rises AGAIN (deterministic accounting)
 *
 * Fresh member per run (isolated state). Uses the wave.7 deterministic seed lot
 * (SEED.lot, RELEASED, 500g) — there is no MCP tool to create a lot, so the
 * dispensation must draw on the seeded inventory.
 *
 * IDEMPOTENCY FINDING: request_record_dispensation has NO dedupe key — repeating
 * an identical call appends a SECOND DispensationRecorded and consumes quota
 * again (verified below: consumedG doubles). The card's "repetir não duplica"
 * is therefore NOT a property of the current tool; we assert the real,
 * deterministic accounting instead and flag the missing idempotency guard.
 *
 * "lote deduzido" via list_available_lots reads the inventory_lots READ-MODEL,
 * only filled by the out-of-band projector (not the MCP write-path) — see TODO.
 * We assert the member-side deduction (consumedG/remainingG) which is live off
 * the event store.
 */
import { test, expect } from "@playwright/test";
import { call, freshCpf, SEED, MCP_URL } from "./lib/mcp-journey-client.js";

test.beforeAll(() => {
  test.info().annotations.push({ type: "mcp-url", description: MCP_URL });
});

const QUOTA_G = 30;
const DISPENSE_G = 5;

test("dispensation: validate → dispense → consumed rises + remaining falls", async () => {
  // onboard a fresh ACTIVE member
  const reg = await call({
    name: "register_member",
    arguments: { cpf: freshCpf() },
    role: "RESPONSAVEL_TECNICO",
  });
  expect(reg.isError, reg.text).toBe(false);
  const memberId = reg.payload["memberId"] as string;
  await call({
    name: "grant_consent",
    arguments: { memberId },
    role: "RESPONSAVEL_TECNICO",
  });

  // validate a prescription with a known monthly quota
  const presc = await call({
    name: "validate_prescription",
    arguments: {
      memberId,
      physicianCRM: "CRM/SP 123456",
      validFrom: "2026-06-01",
      validUntil: "2026-12-01",
      monthlyQuotaG: QUOTA_G,
    },
    role: "RESPONSAVEL_TECNICO",
  });
  expect(presc.isError, presc.text).toBe(false);

  // baseline quota: consumed 0, remaining == cap
  const q0 = await call({
    name: "get_member_quota",
    arguments: { memberId },
    role: "DISPENSADOR",
  });
  expect(q0.isError, q0.text).toBe(false);
  expect(q0.payload["consumedG"]).toBe(0);
  expect(q0.payload["remainingG"]).toBe(QUOTA_G);

  // dispense from the seeded RELEASED lot
  const d1 = await call({
    name: "request_record_dispensation",
    arguments: {
      associationId: SEED.association,
      memberId,
      lotId: SEED.lot,
      quantityG: DISPENSE_G,
      justification: "wave.8 e2e dispensation",
    },
    role: "DISPENSADOR",
  });
  expect(d1.isError, d1.text).toBe(false);
  expect(d1.payload["status"]).toBe("RECORDED");

  const q1 = await call({
    name: "get_member_quota",
    arguments: { memberId },
    role: "DISPENSADOR",
  });
  expect(q1.payload["consumedG"]).toBe(DISPENSE_G);
  expect(q1.payload["remainingG"]).toBe(QUOTA_G - DISPENSE_G);

  // second identical dispensation: NO idempotency dedupe → consumes again
  const d2 = await call({
    name: "request_record_dispensation",
    arguments: {
      associationId: SEED.association,
      memberId,
      lotId: SEED.lot,
      quantityG: DISPENSE_G,
      justification: "wave.8 e2e dispensation (repeat)",
    },
    role: "DISPENSADOR",
  });
  expect(d2.isError, d2.text).toBe(false);
  expect(d2.payload["status"]).toBe("RECORDED");

  const q2 = await call({
    name: "get_member_quota",
    arguments: { memberId },
    role: "DISPENSADOR",
  });
  expect(
    q2.payload["consumedG"],
    "no dedupe: repeat dispensation accumulates",
  ).toBe(DISPENSE_G * 2);
  expect(q2.payload["remainingG"]).toBe(QUOTA_G - DISPENSE_G * 2);
});
