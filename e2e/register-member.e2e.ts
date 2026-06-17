/**
 * Wave.8 journey — ONBOARDING (cb-e2e-onboarding-journey).
 *
 * Against the LIVE MCP server (CANNA_MCP_URL; local seeded stack by default):
 *   register_member  → result status PENDING_CONSENT
 *   grant_consent    → ok
 *   get_member_quota → status ACTIVE  (the live, event-store-backed status)
 *   + audit: the member's event-store stream grew (append-only)
 *
 * Self-contained: register_member mints its own memberId (captured from the
 * result), so this test isolates its own state and depends on no seed member.
 *
 * NOTE ON THE OBSERVE SURFACE — the card names get_members_by_status(ACTIVE).
 * That tool reads the `members` READ-MODEL table, which is populated only by the
 * out-of-band projector (the seed's applyEventsToPg / a projection worker), NOT
 * by the MCP command write-path. With no projection lane running locally, a
 * freshly-registered member never appears there. So we assert the equivalent
 * ACTIVE state via get_member_quota, whose handler folds status directly from
 * the event store (ctx.store) and IS live. See TODO: verifying
 * get_members_by_status requires running the projection worker against the same
 * Postgres. The audit assertion reads the event store directly.
 */
import { test, expect } from "@playwright/test";
import { call, freshCpf, MCP_URL } from "./lib/mcp-journey-client.js";
import { streamCountForMember } from "./lib/event-store-probe.js";

test.beforeAll(() => {
  test.info().annotations.push({ type: "mcp-url", description: MCP_URL });
});

test("onboarding: register → consent → ACTIVE (live status) + audit append", async () => {
  // 1. register → PENDING_CONSENT
  const reg = await call({
    name: "register_member",
    arguments: { cpf: freshCpf() },
    role: "RESPONSAVEL_TECNICO",
  });
  expect(reg.isError, reg.text).toBe(false);
  expect(reg.payload["status"]).toBe("PENDING_CONSENT");
  const memberId = reg.payload["memberId"] as string;
  expect(typeof memberId).toBe("string");

  const afterRegister = await streamCountForMember(memberId);
  expect(afterRegister, "register must append ≥1 event (audit)").toBeGreaterThan(
    0,
  );

  // 2. grant consent → ok
  const consent = await call({
    name: "grant_consent",
    arguments: { memberId },
    role: "RESPONSAVEL_TECNICO",
  });
  expect(consent.isError, consent.text).toBe(false);

  // audit is append-only: consent added another event, never rewrote.
  const afterConsent = await streamCountForMember(memberId);
  expect(afterConsent, "consent must append (append-only audit)").toBeGreaterThan(
    afterRegister,
  );

  // 3. live status is ACTIVE
  const quota = await call({
    name: "get_member_quota",
    arguments: { memberId },
    role: "DIRETORIA",
  });
  expect(quota.isError, quota.text).toBe(false);
  expect(quota.payload["status"]).toBe("ACTIVE");
  expect(quota.payload["memberId"]).toBe(memberId);
});
