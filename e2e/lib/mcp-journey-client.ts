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

export interface ToolCall {
  readonly name: string;
  readonly arguments?: Record<string, unknown>;
  /** Role header for THIS call (tool role gate). Default DIRETORIA. */
  readonly role?: Role;
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
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
    requestInit: {
      headers: {
        "x-canna-user": USER,
        "x-canna-role": c.role ?? "DIRETORIA",
        "x-canna-association": SEED.association,
      },
    },
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

/** Generate a syntactically valid, unique-ish CPF (11 digits) for fresh members. */
export function freshCpf(): string {
  const n = Date.now().toString() + Math.floor(Math.random() * 1e6).toString();
  return n.replace(/\D/g, "").padStart(11, "0").slice(-11);
}
