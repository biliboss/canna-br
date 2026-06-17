/**
 * MCP request authentication — derive the {@link ToolContext} identity
 * (userId / role / associationId) from a VERIFIED credential, never from a
 * caller-supplied raw header.
 *
 * Security model:
 *  - PRODUCTION (JWT_SECRET set): the caller MUST present
 *    `Authorization: Bearer <jwt>`. The JWT is verified as HS256 against
 *    JWT_SECRET; role/userId/associationId come from the SIGNED claims. A
 *    forged `x-canna-role` header is IGNORED — it can never escalate.
 *  - DEV/LOCAL (JWT_SECRET unset): falls back to the legacy header stub
 *    (`x-canna-user`, `x-canna-role`, `x-canna-association`) so local dev and
 *    the test harness keep working without an issuer.
 *
 * The dev/prod switch is the PRESENCE of JWT_SECRET only — no NODE_ENV escape
 * hatch (an unset NODE_ENV must not silently weaken prod).
 *
 * HS256 is hand-rolled on node:crypto to avoid a new dependency. The classic
 * JWT footguns are closed explicitly: alg is pinned to HS256 (the token's own
 * `alg` header can NOT select the algorithm — `none`/RS256 are rejected), the
 * signature compare is constant-time, base64url is decoded (not base64), and
 * `exp` is enforced.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Role, ToolContext } from "./types.js";
import type { CannaEventStore } from "@canna/event-store";
import type { ReadModelQuery } from "@canna/read-models";

const ROLES: ReadonlySet<string> = new Set<Role>([
  "DISPENSADOR",
  "RESPONSAVEL_TECNICO",
  "DIRETORIA",
  "DPO",
  "AUDITOR",
  "FEDERATION",
  "GUEST",
]);

const isRole = (s: unknown): s is Role =>
  typeof s === "string" && ROLES.has(s);

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

const b64urlToBuf = (s: string): Buffer => {
  // base64url → base64, then decode. Reject anything with disallowed chars.
  if (!/^[A-Za-z0-9_-]*$/.test(s)) {
    throw new AuthError("malformed base64url segment");
  }
  return Buffer.from(s, "base64url");
};

interface JwtClaims {
  readonly sub?: unknown;
  readonly role?: unknown;
  readonly associationId?: unknown;
  readonly exp?: unknown;
  readonly [k: string]: unknown;
}

/**
 * Verify a compact JWS (HS256) against `secret` and return its claims.
 * Throws {@link AuthError} on any failure (bad shape, wrong alg, bad
 * signature, expired).
 */
export const verifyHs256 = (
  token: string,
  secret: string,
  now: Date,
): JwtClaims => {
  const parts = token.split(".");
  if (parts.length !== 3) throw new AuthError("token must have 3 segments");
  const [headerB64, payloadB64, sigB64] = parts as [string, string, string];

  // Pin algorithm from OUR side — never trust token.header.alg to select it.
  let header: { alg?: unknown; typ?: unknown };
  try {
    header = JSON.parse(b64urlToBuf(headerB64).toString("utf8")) as typeof header;
  } catch {
    throw new AuthError("unparseable header");
  }
  if (header.alg !== "HS256") {
    throw new AuthError(`unsupported alg: ${String(header.alg)}`);
  }

  const signingInput = `${headerB64}.${payloadB64}`;
  const expectedSig = createHmac("sha256", secret)
    .update(signingInput)
    .digest();
  const presentedSig = b64urlToBuf(sigB64);
  if (
    presentedSig.length !== expectedSig.length ||
    !timingSafeEqual(presentedSig, expectedSig)
  ) {
    throw new AuthError("signature mismatch");
  }

  let claims: JwtClaims;
  try {
    claims = JSON.parse(b64urlToBuf(payloadB64).toString("utf8")) as JwtClaims;
  } catch {
    throw new AuthError("unparseable payload");
  }

  if (typeof claims.exp === "number") {
    const nowSec = Math.floor(now.getTime() / 1000);
    if (nowSec >= claims.exp) throw new AuthError("token expired");
  }

  return claims;
};

/**
 * Mint a short-lived HS256 token for the MCP server. Used by server-side
 * callers (e.g. apps/agent) that hold JWT_SECRET to authenticate to the MCP
 * host. NOT for browser/client use.
 */
export const signHs256 = (
  claims: Readonly<{
    sub: string;
    role: Role;
    associationId: string;
    ttlSeconds?: number;
  }>,
  secret: string,
  now: Date = new Date(),
): string => {
  const header = { alg: "HS256", typ: "JWT" };
  const iat = Math.floor(now.getTime() / 1000);
  const payload = {
    sub: claims.sub,
    role: claims.role,
    associationId: claims.associationId,
    iat,
    exp: iat + (claims.ttlSeconds ?? 300),
  };
  const enc = (o: unknown): string =>
    Buffer.from(JSON.stringify(o), "utf8").toString("base64url");
  const signingInput = `${enc(header)}.${enc(payload)}`;
  const sig = createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64url");
  return `${signingInput}.${sig}`;
};

export interface ResolveDeps {
  readonly store: CannaEventStore;
  readonly readModelStore?: ReadModelQuery;
  /** Reads JWT_SECRET (and the dev header stub). */
  readonly jwtSecret?: string;
  /** Injectable clock for tests. */
  readonly clock?: () => Date;
}

type Headers = Readonly<Record<string, string | string[] | undefined>>;

const getHeader = (headers: Headers, key: string): string | undefined => {
  const raw = headers[key] ?? headers[key.toLowerCase()];
  const v = Array.isArray(raw) ? raw[0] : raw;
  return typeof v === "string" && v.length > 0 ? v : undefined;
};

/**
 * Build the production-grade `resolveContext` used by the HTTP host.
 *
 * - JWT_SECRET set  → Bearer JWT REQUIRED; identity from verified claims;
 *                      raw x-canna-role IGNORED.
 * - JWT_SECRET unset → dev header stub (legacy behaviour).
 */
export const makeResolveContext =
  (deps: ResolveDeps) =>
  async (headers: Headers): Promise<ToolContext> => {
    const now = (deps.clock ?? (() => new Date()))();
    const base = {
      store: deps.store,
      now,
      ...(deps.readModelStore !== undefined
        ? { readModelStore: deps.readModelStore }
        : {}),
    };

    const secret = deps.jwtSecret;

    if (secret !== undefined && secret.length > 0) {
      // PRODUCTION: verified token is the ONLY source of identity.
      const authz = getHeader(headers, "authorization");
      if (authz === undefined) {
        throw new AuthError("missing Authorization header");
      }
      const m = /^Bearer\s+(.+)$/i.exec(authz);
      if (m === null) {
        throw new AuthError("Authorization must be a Bearer token");
      }
      const claims = verifyHs256(m[1]!.trim(), secret, now);

      if (!isRole(claims.role)) {
        throw new AuthError("token role claim missing or invalid");
      }
      const userId = typeof claims.sub === "string" ? claims.sub : "anonymous";
      const associationId =
        typeof claims.associationId === "string"
          ? claims.associationId
          : "unknown";

      const chatId = getHeader(headers, "x-canna-chat");
      return {
        ...base,
        userId,
        role: claims.role,
        associationId,
        ...(chatId !== undefined ? { chatId } : {}),
      };
    }

    // DEV/LOCAL: no issuer configured — fall back to the header stub so local
    // dev and tests work. (This path is unreachable in prod, where JWT_SECRET
    // is always set.)
    const userId = getHeader(headers, "x-canna-user") ?? "anonymous";
    const roleRaw = getHeader(headers, "x-canna-role") ?? "GUEST";
    const role: Role = isRole(roleRaw) ? roleRaw : "GUEST";
    const associationId = getHeader(headers, "x-canna-association") ?? "unknown";
    const chatId = getHeader(headers, "x-canna-chat");
    return {
      ...base,
      userId,
      role,
      associationId,
      ...(chatId !== undefined ? { chatId } : {}),
    };
  };
