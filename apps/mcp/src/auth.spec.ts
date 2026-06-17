/**
 * Adversarial security tests for the MCP auth gate (cb-mcp-auth-gate).
 *
 * These exercise the REAL `makeResolveContext` factory — NOT an injected stub
 * — because that is the exact code path that 500'd... pardon, AUTHENTICATED
 * every production request. Tests that inject their own resolveContext prove
 * nothing about this vulnerability.
 *
 * Proves:
 *  (a) request with NO credential → DENIED (throws; server turns it into a
 *      non-200 AUTH_FAILED and the tool never runs)
 *  (b) request with a forged `x-canna-role: DIRETORIA` header but NO valid
 *      token → DENIED; the raw header can NOT escalate
 *  (c) request with a valid JWT (role in signed claims) → authenticates with
 *      the CLAIM role even when a conflicting forged header is also present
 */
import { describe, it, expect } from "vitest";
import { createInMemoryEventStore } from "@canna/event-store";
import {
  makeResolveContext,
  verifyHs256,
  signHs256,
  AuthError,
} from "./auth.js";

const SECRET = "test-secret-do-not-use-in-prod";
const NOW = new Date("2026-06-17T12:00:00Z");
const store = createInMemoryEventStore();
const clock = () => NOW;

const prodResolve = makeResolveContext({ store, jwtSecret: SECRET, clock });
const devResolve = makeResolveContext({ store, clock }); // JWT_SECRET unset

describe("auth gate / PRODUCTION (JWT_SECRET set)", () => {
  it("(a) NO credential → DENIED", async () => {
    await expect(prodResolve({})).rejects.toBeInstanceOf(AuthError);
  });

  it("(a) Bearer present but garbage token → DENIED", async () => {
    await expect(
      prodResolve({ authorization: "Bearer not.a.jwt" }),
    ).rejects.toBeInstanceOf(AuthError);
  });

  it("(b) forged x-canna-role: DIRETORIA, NO token → DENIED (header can't escalate)", async () => {
    await expect(
      prodResolve({ "x-canna-role": "DIRETORIA", "x-canna-user": "attacker" }),
    ).rejects.toBeInstanceOf(AuthError);
  });

  it("(c) valid JWT → authenticates with the CLAIM role; conflicting forged header IGNORED", async () => {
    const token = signHs256(
      { sub: "user-123", role: "DISPENSADOR", associationId: "assoc-1" },
      SECRET,
      NOW,
    );
    const ctx = await prodResolve({
      authorization: `Bearer ${token}`,
      // Attacker also sends a forged elevated header in the SAME request:
      "x-canna-role": "DIRETORIA",
      "x-canna-association": "other-assoc",
      "x-canna-user": "spoofed",
    });
    // Identity comes from the SIGNED claims, never the raw headers:
    expect(ctx.role).toBe("DISPENSADOR");
    expect(ctx.userId).toBe("user-123");
    expect(ctx.associationId).toBe("assoc-1");
  });
});

describe("auth gate / JWT verification footguns", () => {
  it("rejects alg:none (algorithm-confusion bypass)", () => {
    const enc = (o: unknown) =>
      Buffer.from(JSON.stringify(o)).toString("base64url");
    const forged = `${enc({ alg: "none", typ: "JWT" })}.${enc({
      sub: "x",
      role: "DIRETORIA",
    })}.`;
    expect(() => verifyHs256(forged, SECRET, NOW)).toThrow(AuthError);
  });

  it("rejects a token signed with the WRONG secret", () => {
    const token = signHs256(
      { sub: "u", role: "DIRETORIA", associationId: "a" },
      "attacker-secret",
      NOW,
    );
    expect(() => verifyHs256(token, SECRET, NOW)).toThrow(AuthError);
  });

  it("rejects an EXPIRED token", () => {
    const past = new Date("2020-01-01T00:00:00Z");
    const token = signHs256(
      { sub: "u", role: "DIRETORIA", associationId: "a", ttlSeconds: 60 },
      SECRET,
      past,
    );
    expect(() => verifyHs256(token, SECRET, NOW)).toThrow(/expired/);
  });

  it("accepts a freshly-signed valid token round-trip", () => {
    const token = signHs256(
      { sub: "u", role: "AUDITOR", associationId: "a" },
      SECRET,
      NOW,
    );
    const claims = verifyHs256(token, SECRET, NOW);
    expect(claims.role).toBe("AUDITOR");
    expect(claims.sub).toBe("u");
  });
});

describe("auth gate / DEV mode (JWT_SECRET unset)", () => {
  it("falls back to header stub so local dev still works", async () => {
    const ctx = await devResolve({
      "x-canna-user": "dev",
      "x-canna-role": "DIRETORIA",
      "x-canna-association": "dev-assoc",
    });
    expect(ctx.role).toBe("DIRETORIA");
    expect(ctx.userId).toBe("dev");
  });

  it("unknown role downgrades to GUEST", async () => {
    const ctx = await devResolve({ "x-canna-role": "SUPERADMIN" });
    expect(ctx.role).toBe("GUEST");
  });
});
