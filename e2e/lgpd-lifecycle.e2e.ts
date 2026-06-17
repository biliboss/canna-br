/**
 * Wave.8 journey — LGPD LIFECYCLE (cb-e2e-lgpd-journey).
 *
 * Against the LIVE MCP server (CANNA_MCP_URL; local seeded stack by default).
 * Each sub-flow registers its OWN fresh member so state is isolated and the
 * irreversible anonymize never collides with the suspend/reinstate/revoke flows.
 *
 *   A. suspend_member → status SUSPENDED → reinstate_member → status ACTIVE
 *   B. revoke_consent (titular withdrawal, LGPD Art.8 §5) → member leaves ACTIVE
 *   C. anonymize_member (crypto-delete, LGPD Art.18 IV) → cpfHashErased:true
 *   + audit append-only: every transition appends to the member's event stream,
 *     monotonically (verified via the event-store probe).
 *
 * Live status is read via get_member_quota (event-store-backed), since the
 * `members` read-model is only updated by the out-of-band projector.
 */
import { test, expect } from "@playwright/test";
import { call, freshCpf, MCP_URL } from "./lib/mcp-journey-client.js";
import { streamCountForMember } from "./lib/event-store-probe.js";

test.beforeAll(() => {
  test.info().annotations.push({ type: "mcp-url", description: MCP_URL });
});

async function onboardActive(): Promise<string> {
  const reg = await call({
    name: "register_member",
    arguments: { cpf: freshCpf() },
    role: "RESPONSAVEL_TECNICO",
  });
  expect(reg.isError, reg.text).toBe(false);
  const memberId = reg.payload["memberId"] as string;
  const consent = await call({
    name: "grant_consent",
    arguments: { memberId },
    role: "RESPONSAVEL_TECNICO",
  });
  expect(consent.isError, consent.text).toBe(false);
  return memberId;
}

async function statusOf(memberId: string): Promise<unknown> {
  const q = await call({
    name: "get_member_quota",
    arguments: { memberId },
    role: "DIRETORIA",
  });
  expect(q.isError, q.text).toBe(false);
  return q.payload["status"];
}

test("LGPD A: suspend → SUSPENDED → reinstate → ACTIVE (append-only audit)", async () => {
  const memberId = await onboardActive();
  const before = await streamCountForMember(memberId);

  const susp = await call({
    name: "suspend_member",
    arguments: { memberId, reason: "wave.8 e2e suspension" },
    role: "RESPONSAVEL_TECNICO",
  });
  expect(susp.isError, susp.text).toBe(false);
  expect(await statusOf(memberId)).toBe("SUSPENDED");

  const afterSuspend = await streamCountForMember(memberId);
  expect(afterSuspend, "suspend appends").toBeGreaterThan(before);

  const rein = await call({
    name: "reinstate_member",
    arguments: { memberId },
    role: "RESPONSAVEL_TECNICO",
  });
  expect(rein.isError, rein.text).toBe(false);
  expect(await statusOf(memberId)).toBe("ACTIVE");

  const afterReinstate = await streamCountForMember(memberId);
  expect(afterReinstate, "reinstate appends (never rewrites)").toBeGreaterThan(
    afterSuspend,
  );
});

test("LGPD B: revoke_consent removes member from ACTIVE", async () => {
  const memberId = await onboardActive();
  expect(await statusOf(memberId)).toBe("ACTIVE");

  const rev = await call({
    name: "revoke_consent",
    arguments: { memberId },
    role: "DPO",
  });
  expect(rev.isError, rev.text).toBe(false);
  // domain transition ACTIVE → SUSPENDED on titular withdrawal.
  expect(await statusOf(memberId)).not.toBe("ACTIVE");
});

test("LGPD C: anonymize_member crypto-deletes cpfHash (irreversible)", async () => {
  const memberId = await onboardActive();

  const anon = await call({
    name: "anonymize_member",
    arguments: { memberId },
    role: "DPO",
  });
  expect(anon.isError, anon.text).toBe(false);
  expect(anon.payload["cpfHashErased"]).toBe(true);
  expect(anon.payload["status"]).toBe("ANONYMIZED");
});
