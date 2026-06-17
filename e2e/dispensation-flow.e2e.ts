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
// Distinct actor for RDC1.014 approval segregation — must differ from the
// default requester identity (the DISPENSADOR who requests).
const APPROVER = "01HZAPPROVERE2E000000000002";

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

  // RDC1.014 two-step: DISPENSADOR REQUESTS (no quota consumed yet) → distinct
  // RT/DIRETORIA APPROVES → RECORDED + quota consumed. (approval gate 064f3cd)
  const req1 = await call({
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
  expect(req1.isError, req1.text).toBe(false);
  expect(req1.payload["status"]).toBe("PENDING_APPROVAL");
  const dispensationId = req1.payload["dispensationId"] as string;

  // request alone consumes NOTHING (segregation: effect happens at approval)
  const qPending = await call({
    name: "get_member_quota",
    arguments: { memberId },
    role: "DISPENSADOR",
  });
  expect(qPending.payload["consumedG"], "pending request consumes nothing").toBe(0);

  // segregation: the requesting DISPENSADOR cannot approve their own request
  const selfApprove = await call({
    name: "approve_dispensation",
    arguments: { associationId: SEED.association, dispensationId },
    role: "DISPENSADOR",
  });
  expect(selfApprove.isError, "self-approval must be denied").toBe(true);

  // distinct approver (RT) effects it → RECORDED + quota consumed
  const appr1 = await call({
    name: "approve_dispensation",
    arguments: { associationId: SEED.association, dispensationId },
    role: "RESPONSAVEL_TECNICO",
    user: APPROVER,
  });
  expect(appr1.isError, appr1.text).toBe(false);
  expect(appr1.payload["status"]).toBe("RECORDED");

  const q1 = await call({
    name: "get_member_quota",
    arguments: { memberId },
    role: "DISPENSADOR",
  });
  expect(q1.payload["consumedG"]).toBe(DISPENSE_G);
  expect(q1.payload["remainingG"]).toBe(QUOTA_G - DISPENSE_G);

  // a second, distinct request→approve cycle accumulates (separate dispensation)
  const req2 = await call({
    name: "request_record_dispensation",
    arguments: {
      associationId: SEED.association,
      memberId,
      lotId: SEED.lot,
      quantityG: DISPENSE_G,
      justification: "wave.8 e2e dispensation (second cycle)",
    },
    role: "DISPENSADOR",
  });
  expect(req2.isError, req2.text).toBe(false);
  const dispensationId2 = req2.payload["dispensationId"] as string;
  const appr2 = await call({
    name: "approve_dispensation",
    arguments: { associationId: SEED.association, dispensationId: dispensationId2 },
    role: "RESPONSAVEL_TECNICO",
    user: APPROVER,
  });
  expect(appr2.isError, appr2.text).toBe(false);
  expect(appr2.payload["status"]).toBe("RECORDED");

  const q2 = await call({
    name: "get_member_quota",
    arguments: { memberId },
    role: "DISPENSADOR",
  });
  expect(q2.payload["consumedG"]).toBe(DISPENSE_G * 2);
  expect(q2.payload["remainingG"]).toBe(QUOTA_G - DISPENSE_G * 2);
});
