/**
 * Drives the LIVE canna MCP server over StreamableHTTP (the same wire protocol
 * Open WebUI uses in prod). NO mock — env CANNA_MCP_URL points at production by
 * default; green can repoint it at a local buggy build to prove the guard.
 *
 * connect() performs the real initialize + notifications/initialized handshake,
 * so this exercises the stateless-per-request transport + handshake live-bugs.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export const MCP_URL =
  process.env.CANNA_MCP_URL ?? "https://mcp.cannabr.org";
const MEMBER = process.env.CANNA_TEST_MEMBER_ID ?? "01HM0MEMBER000000000000001";
const ASSOC =
  process.env.CANNA_TEST_ASSOCIATION ?? "01HM0ASSOC0000000000000001";
const USER = process.env.CANNA_TEST_USER ?? "01HM0ACTOR0000000000000001";
const ROLE = process.env.CANNA_TEST_ROLE ?? "DISPENSADOR";

export const QUOTA_RESOURCE_URI = "ui://member-quota-card/app.html";

export interface ProdQuotaProbe {
  /** _meta off the tools/list entry for get_member_quota (raw passthrough). */
  readonly toolMeta: Record<string, unknown> | undefined;
  /** Parsed JSON payload from get_member_quota content[0].text. */
  readonly payload: Record<string, unknown>;
  /** Raw text of the tool result (what the widget receives). */
  readonly toolResultText: string;
  /** The member-quota-card HTML bundle text from resources/read. */
  readonly bundleHtml: string;
}

export async function probeProdMemberQuota(): Promise<ProdQuotaProbe> {
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
    requestInit: {
      headers: {
        "x-canna-user": USER,
        "x-canna-role": ROLE,
        "x-canna-association": ASSOC,
      },
    },
  });
  const client = new Client({ name: "canna-e2e-prod", version: "0.0.0" });
  await client.connect(transport);
  try {
    const { tools } = await client.listTools();
    const quotaTool = tools.find((t) => t.name === "get_member_quota");
    if (quotaTool === undefined) {
      throw new Error("get_member_quota not advertised by prod MCP server");
    }
    const toolMeta = (quotaTool as { _meta?: Record<string, unknown> })._meta;

    const call = (await client.callTool({
      name: "get_member_quota",
      arguments: { memberId: MEMBER },
    })) as {
      isError?: boolean;
      content?: ReadonlyArray<{ type: string; text?: string }>;
    };
    if (call.isError === true) {
      throw new Error(
        `get_member_quota errored: ${JSON.stringify(call.content)}`,
      );
    }
    const toolResultText = call.content?.[0]?.text;
    if (typeof toolResultText !== "string") {
      throw new Error("get_member_quota returned no text content");
    }
    const payload = JSON.parse(toolResultText) as Record<string, unknown>;

    const read = (await client.readResource({
      uri: QUOTA_RESOURCE_URI,
    })) as { contents?: ReadonlyArray<{ text?: string }> };
    const bundleHtml = read.contents?.[0]?.text;
    if (typeof bundleHtml !== "string" || bundleHtml.length === 0) {
      throw new Error(`resources/read ${QUOTA_RESOURCE_URI} returned no HTML`);
    }

    return { toolMeta, payload, toolResultText, bundleHtml };
  } finally {
    await client.close();
  }
}

export const expected = {
  remainingG: Number(process.env.CANNA_EXPECTED_REMAINING_G ?? "23"),
  consumedG: Number(process.env.CANNA_EXPECTED_CONSUMED_G ?? "7"),
  memberId: MEMBER,
};
