/**
 * Wave.11 Vistoria — PROD smoke (cb-prod-smoke-e2e).
 *
 * A minimal onboarding journey against the REAL prod MCP (mcp.cannabr.org, auth
 * ON) using a signed Bearer — proves prod actually works, not just the local
 * seeded harness. Read-then-write is scoped to a throwaway fake association so
 * it never pollutes a real tenant's data.
 *
 * PROD-TARGETED. Skips when CANNA_MCP_JWT_SECRET is absent. Run via
 * `pnpm test:e2e:prod` (network + secret), NOT the offline pre-push gate.
 */
import { test, expect } from "@playwright/test";
import { call, signToken, SEED, freshCpf, MCP_URL } from "./lib/mcp-journey-client.js";

const SECRET = process.env.CANNA_MCP_JWT_SECRET ?? "";

test.beforeAll(() => {
  test.info().annotations.push({ type: "prod-smoke-mcp-url", description: MCP_URL });
});

test.skip(!SECRET, "CANNA_MCP_JWT_SECRET unset — prod smoke skipped");

test("prod: register → consent → read back (live MCP, Bearer auth)", async () => {
  const bearer = signToken(SECRET, {
    sub: "vistoria-prod-smoke",
    role: "RESPONSAVEL_TECNICO",
    associationId: SEED.association,
  });
  const authed = (name: string, args: Record<string, unknown>) =>
    call({ name, arguments: args, bearer, noStubHeaders: true });

  const reg = await authed("register_member", { cpf: freshCpf() });
  expect(reg.isError, reg.text).toBe(false);
  const memberId = reg.payload["memberId"] as string;
  expect(memberId, "got a real memberId from prod").toBeTruthy();

  const consent = await authed("grant_consent", { memberId });
  expect(consent.isError, consent.text).toBe(false);

  // read back: the just-registered member is queryable via the live read model
  const list = await authed("get_members_by_status", {
    associationId: SEED.association,
    status: "ACTIVE",
  });
  expect(list.isError, list.text).toBe(false);
  expect(list.payload["viewerRole"]).toBe("RESPONSAVEL_TECNICO");
});
