/**
 * Wave.11 Vistoria — AUTH e2e (cb-auth-e2e-committed).
 *
 * Proves, against an auth-ENFORCING MCP (prod mcp.cannabr.org, JWT_SECRET set),
 * that the security gate holds end-to-end — not just in the apps/mcp unit specs:
 *   (a) NO credential            → tools/call DENIED
 *   (b) forged x-canna-role, NO Bearer → DENIED (raw header can't authenticate)
 *   (c) valid signed Bearer      → ALLOWED
 *
 * PROD-TARGETED: the local harness runs JWT-unset (dev header mode) so it can't
 * exercise enforcement. This suite runs against CANNA_MCP_URL with the real
 * secret in CANNA_MCP_JWT_SECRET. Skips cleanly when the secret is absent so the
 * offline pre-push gate never depends on the network. (Enforcement LOGIC is also
 * covered offline by apps/mcp/src/auth.spec.ts — this is the live proof.)
 */
import { test, expect } from "@playwright/test";
import { call, signToken, SEED, MCP_URL } from "./lib/mcp-journey-client.js";

const SECRET = process.env.CANNA_MCP_JWT_SECRET ?? "";

test.beforeAll(() => {
  test.info().annotations.push({ type: "auth-mcp-url", description: MCP_URL });
});

// A read-only tool — exercising the auth gate must not mutate prod state.
const READ_TOOL = "get_members_by_status";
const READ_ARGS = { associationId: SEED.association, status: "ACTIVE" };

/** A request is "denied" if the SDK throws OR the tool returns isError. */
async function denied(c: Parameters<typeof call>[0]): Promise<boolean> {
  try {
    const r = await call(c);
    return r.isError === true;
  } catch {
    return true; // transport/protocol-level rejection
  }
}

test.skip(!SECRET, "CANNA_MCP_JWT_SECRET unset — prod-targeted auth e2e skipped");

test("(a) no credential → DENIED", async () => {
  expect(
    await denied({ name: READ_TOOL, arguments: READ_ARGS, noStubHeaders: true }),
  ).toBe(true);
});

test("(b) forged x-canna-role without Bearer → DENIED (header can't authenticate)", async () => {
  expect(
    await denied({ name: READ_TOOL, arguments: READ_ARGS, role: "DIRETORIA" }),
  ).toBe(true);
});

test("(c) valid signed Bearer → ALLOWED", async () => {
  const bearer = signToken(SECRET, {
    sub: "vistoria-auth-e2e",
    role: "DIRETORIA",
    associationId: SEED.association,
  });
  const r = await call({
    name: READ_TOOL,
    arguments: READ_ARGS,
    bearer,
    noStubHeaders: true,
  });
  expect(r.isError, r.text).toBe(false);
});

test("(d) tampered Bearer (wrong secret) → DENIED", async () => {
  const bad = signToken("not-the-real-secret-000000000000000000000000", {
    sub: "vistoria-auth-e2e",
    role: "DIRETORIA",
    associationId: SEED.association,
  });
  expect(
    await denied({
      name: READ_TOOL,
      arguments: READ_ARGS,
      bearer: bad,
      noStubHeaders: true,
    }),
  ).toBe(true);
});
