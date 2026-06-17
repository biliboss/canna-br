/**
 * Thin LIVE MCP client for the wave.8 journey e2es. Unlike mcp-prod-client.ts
 * (single fixed-role probe of get_member_quota), each journey calls multiple
 * tools that gate on DIFFERENT roles (register/validate/suspend need
 * RESPONSAVEL_TECNICO|DIRETORIA; dispensation needs DISPENSADOR; anonymize
 * needs DPO|DIRETORIA). So this opens a connection with a per-call role header
 * and parses the JSON text payload.
 *
 * Targets CANNA_MCP_URL (default https://mcp.cannabr.org). The journey suites
 * are meant to run against the LOCAL seeded stack (e2e/lib/local-mcp-harness.sh
 * → http://localhost:3001) so they are deterministic and never pollute prod.
 * Both targets run header-auth (prod stub / local JWT-unset dev mode), so the
 * same x-canna-* headers drive both.
 */
import { createHmac } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export const MCP_URL = process.env.CANNA_MCP_URL ?? "https://mcp.cannabr.org";

/** Deterministic ids from the wave.7 seed (tooling/test-utils). */
export const SEED = {
  association: "01HZASSOC00000000000000001",
  lot: "01HZSEEDLOT00000000000001",
  memberSuspended: "01HZSEEDMEMBERSUSPEND00001",
} as const;

export type Role =
  | "DISPENSADOR"
  | "RESPONSAVEL_TECNICO"
  | "DPO"
  | "AUDITOR"
  | "DIRETORIA";

const USER = "01HZACTORE2E0000000000001";
/**
 * Distinct second actor. RDC1.014 two-person segregation requires the approver
 * of a dispensation to be a DIFFERENT person from the requester — pass
 * `user: APPROVER_USER` on approve_dispensation calls.
 */
export const APPROVER_USER = "01HZACTORE2E0000000000002";

export interface ToolCall {
  readonly name: string;
  readonly arguments?: Record<string, unknown>;
  /** Role header for THIS call (tool role gate). Default DIRETORIA. */
  readonly role?: Role;
  /**
   * User identity for THIS call. Default USER. Override when a flow needs a
   * DISTINCT actor — e.g. RDC1.014 approval segregation, where the approver
   * must not be the same person as the requester.
   */
  readonly user?: string;
  /**
   * Signed HS256 Bearer token. When set, sent as `Authorization: Bearer <t>`.
   * Required against an auth-enforcing MCP (prod: JWT_SECRET set). Use
   * {@link signToken} to mint one.
   */
  readonly bearer?: string;
  /**
   * Omit the x-canna-* stub headers entirely (simulate an unidentified caller).
   * Used by the auth e2e to prove a request with NO credential is denied.
   */
  readonly noStubHeaders?: boolean;
}

export interface ToolResult {
  readonly isError: boolean;
  /** Parsed JSON from content[0].text (tools return JSON-as-text). */
  readonly payload: Record<string, unknown>;
  readonly text: string;
}

/**
 * Open a connection, run the calls in sequence (re-headered per call), close.
 * One connection per call list keeps each test isolated; calls within a list
 * share the connection but each carries its own role header via a fresh
 * transport is NOT possible (headers are bound at transport build), so we open
 * a connection PER role-group. To keep it simple and correct, we open a fresh
 * client per call — cheap against a local server, and guarantees the header
 * matches the tool gate exactly.
 */
export async function call(c: ToolCall): Promise<ToolResult> {
  const headers: Record<string, string> = c.noStubHeaders
    ? {}
    : {
        "x-canna-user": c.user ?? USER,
        "x-canna-role": c.role ?? "DIRETORIA",
        "x-canna-association": SEED.association,
      };
  if (c.bearer) headers["Authorization"] = `Bearer ${c.bearer}`;
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
    requestInit: { headers },
  });
  const client = new Client({ name: "canna-e2e-journey", version: "0.0.0" });
  await client.connect(transport);
  try {
    const res = (await client.callTool({
      name: c.name,
      arguments: c.arguments ?? {},
    })) as {
      isError?: boolean;
      content?: ReadonlyArray<{ type: string; text?: string }>;
    };
    const text = res.content?.[0]?.text ?? "";
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(text) as Record<string, unknown>;
    } catch {
      /* non-JSON text result — leave payload empty, expose raw text */
    }
    return { isError: res.isError === true, payload, text };
  } finally {
    await client.close();
  }
}

/**
 * Mint a signed HS256 Bearer for the auth-enforcing MCP. Mirrors
 * apps/mcp/src/auth.ts signHs256 (same header/claims/base64url) so the e2e
 * proves the real verification path. Secret read by the caller from env
 * (CANNA_MCP_JWT_SECRET) — never hardcode the secret in a test.
 */
export function signToken(
  secret: string,
  claims: { sub: string; role: Role; associationId: string; ttlSeconds?: number },
  now: number = Date.now(),
): string {
  const enc = (o: unknown): string =>
    Buffer.from(JSON.stringify(o), "utf8").toString("base64url");
  const iat = Math.floor(now / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: claims.sub,
    role: claims.role,
    associationId: claims.associationId,
    iat,
    exp: iat + (claims.ttlSeconds ?? 300),
  };
  const signingInput = `${enc(header)}.${enc(payload)}`;
  const sig = createHmac("sha256", secret).update(signingInput).digest("base64url");
  return `${signingInput}.${sig}`;
}

/** Generate a syntactically valid, unique-ish CPF (11 digits) for fresh members. */
export function freshCpf(): string {
  const n = Date.now().toString() + Math.floor(Math.random() * 1e6).toString();
  return n.replace(/\D/g, "").padStart(11, "0").slice(-11);
}
