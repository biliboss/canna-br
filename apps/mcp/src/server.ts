import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { CannaMcpDeps, ToolContext, ToolDefinition } from "./types.js";
import { allTools } from "./tools/index.js";
import { domainError, isDomainError } from "@canna/shared";

interface CreateServerResult {
  readonly server: Server;
  readonly tools: ReadonlyMap<string, ToolDefinition<Record<string, unknown>>>;
}

const toToolListItem = (t: ToolDefinition<Record<string, unknown>>) => {
  const base = {
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  };
  if (t.uiResourceUri === undefined) return base;
  return {
    ...base,
    _meta: {
      ui: { resourceUri: t.uiResourceUri },
      riskLevel: t.riskLevel,
    },
  };
};

export const createCannaMcpServer = (deps: CannaMcpDeps): CreateServerResult => {
  const server = new Server(
    { name: "canna-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  const tools = new Map<string, ToolDefinition<Record<string, unknown>>>();
  for (const t of allTools) tools.set(t.name, t);

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools.map(toToolListItem),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const tool = tools.get(request.params.name);
    if (tool === undefined) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "TOOL_NOT_FOUND",
              name: request.params.name,
            }),
          },
        ],
      };
    }

    const headers =
      (extra as { requestInfo?: { headers?: Record<string, string> } })
        ?.requestInfo?.headers ?? {};

    let ctx: ToolContext;
    try {
      ctx = await deps.resolveContext(headers);
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: "AUTH_FAILED", message: err }),
          },
        ],
      };
    }

    if (!tool.allowedRoles.includes(ctx.role)) {
      const e = domainError("ROLE_INSUFFICIENT", "Role not permitted for tool", {
        tool: tool.name,
        role: ctx.role,
      });
      void isDomainError(e); // satisfy import
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "ROLE_INSUFFICIENT",
              tool: tool.name,
              role: ctx.role,
            }),
          },
        ],
      };
    }

    const args = (request.params.arguments ?? {}) as Record<string, unknown>;
    const result = await tool.handler(args, ctx);
    return result;
  });

  return { server, tools };
};
