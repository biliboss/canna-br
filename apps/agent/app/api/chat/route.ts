import { createOpenAI } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import {
  type JSONSchema7,
  type ToolSet,
  streamText,
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { getMcpTools, getOkfContext } from "../mcp-client";

const DEFAULT_MODEL = process.env.MODEL_ID ?? "google/gemini-2.5-flash-lite";
const MCP_ENABLED = process.env.MCP_ENABLED === "1";

export const maxDuration = 30;

async function getMCPTools(): Promise<ToolSet> {
  if (!MCP_ENABLED) return {};
  try {
    return await getMcpTools();
  } catch (e) {
    console.warn("Failed to connect to MCP server:", e);
    return {};
  }
}

// Pull the OKF domain bundle (knowledge) to ground the model alongside tools.
// Gated on the same MCP_ENABLED flag; degrades to "" if the server is down.
async function getOkfGrounding(): Promise<string> {
  if (!MCP_ENABLED) return "";
  try {
    return await getOkfContext();
  } catch (e) {
    console.warn("Failed to load OKF domain context:", e);
    return "";
  }
}

// Strip tools that are app-only (visibility includes "app" but not "llm")
function filterLlmVisibleTools(tools: ToolSet): ToolSet {
  return Object.fromEntries(
    Object.entries(tools).filter(([_, tool]) => {
      const visibility = (tool as Record<string, unknown>)?._meta as
        | { visibility?: string[] }
        | undefined;
      return !visibility?.visibility || visibility.visibility.includes("llm");
    }),
  );
}

export async function POST(req: Request) {
  const {
    messages,
    system,
    tools,
    model,
    apiKey,
  }: {
    messages: UIMessage[];
    system?: string;
    tools?: Record<string, { description?: string; parameters: JSONSchema7 }>;
    model?: string;
    apiKey?: string;
  } = await req.json();

  // BYOK: client key wins; fall back to the server env key (set in dev, absent in prod).
  const key = apiKey?.trim() || process.env.OPENROUTER_API_KEY;
  if (!key) {
    return Response.json(
      {
        error:
          "Forneça sua OpenRouter API key (campo no topo). Em produção não há key do servidor.",
      },
      { status: 401 },
    );
  }

  const openrouter = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: key,
  });
  const modelId = model?.trim() || DEFAULT_MODEL;

  const [mcpTools, okfContext] = await Promise.all([
    getMCPTools(),
    getOkfGrounding(),
  ]);

  // Inject OKF knowledge ahead of any client-supplied system prompt. `system`
  // may be undefined (e.g. the e2e POSTs only `messages`) — filter(Boolean)
  // keeps the join clean and never grounds with literal "undefined".
  const groundedSystem =
    [okfContext, system].filter(Boolean).join("\n\n") || undefined;

  const result = streamText({
    model: openrouter(modelId),
    messages: await convertToModelMessages(messages),
    system: groundedSystem,
    tools: {
      ...filterLlmVisibleTools(mcpTools),
      ...frontendTools(tools ?? {}),
    },
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: true,
  });
}
