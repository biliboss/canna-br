import { getMcpClient, getMcpTools } from "../mcp-client";

export const maxDuration = 30;

const MCP_APP_MIME = "text/html;profile=mcp-app";

export async function POST(req: Request) {
  let body: {
    method?: unknown;
    params?: Record<string, unknown>;
    id?: unknown;
  } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const method = body.method;
  const params = (body.params ?? {}) as Record<string, unknown>;
  const rpcId = body.id ?? null;
  if (typeof method !== "string") {
    return Response.json({ error: "Missing method" }, { status: 400 });
  }

  // Gap #4 (mcp-apps degrade): the MCP host can be down (cold start, deploy,
  // network). Obtaining the client must NOT bubble a raw 500 to the widget —
  // degrade gracefully with a structured 503 the host can surface as "service
  // unavailable, retry" instead of a stack trace. Proven by route.degrade.test.mts.
  let client: Awaited<ReturnType<typeof getMcpClient>>;
  try {
    client = await getMcpClient();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return Response.json(
      {
        jsonrpc: "2.0",
        id: rpcId,
        error: {
          code: -32001,
          message: "MCP host unavailable",
          data: { reason: message, retryable: true },
        },
      },
      { status: 503 },
    );
  }

  try {
    switch (method) {
      case "mcp-apps/read-resource": {
        if (typeof params["uri"] !== "string") {
          return Response.json({ error: "Missing uri" }, { status: 400 });
        }
        const result = await client.readResource({ uri: params["uri"] });
        const contents = (result as { contents?: unknown }).contents;
        const match = Array.isArray(contents)
          ? (contents as Array<Record<string, unknown>>).find(
              (c) => c["uri"] === params["uri"],
            )
          : undefined;
        return Response.json({
          uri: params["uri"],
          mimeType: MCP_APP_MIME,
          html: typeof match?.["text"] === "string" ? match["text"] : "",
          meta: match?.["_meta"] ?? null,
        });
      }
      case "tools/call": {
        if (typeof params["name"] !== "string") {
          return Response.json({ error: "Missing tool name" }, { status: 400 });
        }
        const tools = await getMcpTools();
        if (!(params["name"] in tools)) {
          return Response.json(
            {
              jsonrpc: "2.0",
              id: rpcId,
              error: { code: -32601, message: "Tool not found" },
            },
            { status: 404 },
          );
        }
        const tool = tools[params["name"] as string];
        if (!tool?.execute) {
          return Response.json(
            { error: `Tool '${params["name"] as string}' is not callable` },
            { status: 400 },
          );
        }
        const result = await tool.execute(
          (params["arguments"] ?? {}) as Record<string, unknown>,
          {
            toolCallId: `mcp-apps-bridge-${crypto.randomUUID()}`,
            messages: [],
          },
        );
        return Response.json(result);
      }
      case "resources/read": {
        if (typeof params["uri"] !== "string") {
          return Response.json({ error: "Missing uri" }, { status: 400 });
        }
        return Response.json(
          await client.readResource({ uri: params["uri"] }),
        );
      }
      case "resources/list": {
        return Response.json(await client.listResources());
      }
      default:
        return Response.json({ error: "Unsupported method" }, { status: 400 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return Response.json({ error: message }, { status: 500 });
  }
}
