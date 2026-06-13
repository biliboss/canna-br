import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { CannaMcpDeps, ToolContext, ToolDefinition } from "./types.js";
import { allTools } from "./tools/index.js";
import { allManifests, manifestByUri } from "@canna/ui-apps";
import { domainError, isDomainError } from "@canna/shared";

const UI_APP_MIME = "text/html";

// Root of the @canna/ui-apps package (parent of its src/index.ts entrypoint),
// resolved at runtime so the built single-file widget bundles in dist/ load
// regardless of cwd. htmlBundlePath in each manifest is relative to this root.
const uiAppsRoot = dirname(
  dirname(createRequire(import.meta.url).resolve("@canna/ui-apps")),
);

const readBundleHtml = (htmlBundlePath: string): string =>
  readFileSync(resolve(uiAppsRoot, htmlBundlePath), "utf8");

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
      // ext-apps spec key is SLASH-form "ui/resourceUri" (a flat key), NOT the
      // nested dot form { ui: { resourceUri } }. The dot form produces ZERO
      // console errors but the widget iframe NEVER renders — assistant-ui reads
      // the slash key. (Caught by live chrome QA: tool returned data, answer was
      // text-only, no inline widget.)
      "ui/resourceUri": t.uiResourceUri,
      riskLevel: t.riskLevel,
    },
  };
};

export const createCannaMcpServer = (deps: CannaMcpDeps): CreateServerResult => {
  const server = new Server(
    { name: "canna-mcp", version: "0.1.0" },
    { capabilities: { tools: {}, resources: {} } },
  );

  const tools = new Map<string, ToolDefinition<Record<string, unknown>>>();
  for (const t of allTools) tools.set(t.name, t);

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: allTools.map(toToolListItem),
  }));

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: allManifests.map((m) => ({
      uri: m.resourceUri,
      name: m.title,
      description: m.description,
      mimeType: UI_APP_MIME,
    })),
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    const manifest = manifestByUri(uri);
    if (manifest === undefined) {
      throw domainError("RESOURCE_NOT_FOUND", "Unknown ui:// resource", {
        uri,
      });
    }
    return {
      contents: [
        {
          uri,
          mimeType: UI_APP_MIME,
          text: readBundleHtml(manifest.htmlBundlePath),
        },
      ],
    };
  });

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
    // Surface the widget resource on the CALL RESULT too (slash-form key) — the
    // host (assistant-ui) reads `_meta["ui/resourceUri"]` off the tool result to
    // decide which ui:// app renders inline for THIS message. tools/list _meta
    // wires discovery; the per-result _meta triggers the actual render.
    if (tool.uiResourceUri !== undefined && result.isError !== true) {
      const existingMeta =
        (result as { _meta?: Record<string, unknown> })._meta ?? {};
      return {
        ...result,
        _meta: { ...existingMeta, "ui/resourceUri": tool.uiResourceUri },
      };
    }
    return result;
  });

  return { server, tools };
};
