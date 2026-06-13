/**
 * Live MCP smoke for register_member — drives the REAL running MCP server over
 * StreamableHTTP (not in-memory), proving the tool registers a member end to
 * end on Postgres. Bypasses the LLM (the assistant-ui/AI-SDK-v6 tool-input
 * streaming intermittently collapses args to `{}` — a host-side flake, not a
 * tool bug; this script isolates the tool).
 *
 * Run (server must be up on :3001 with DATABASE_URL):
 *   pnpm --filter @canna/mcp exec tsx scripts/qa-call-register-member.ts
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_URL = process.env.MCP_URL ?? "http://localhost:3001/";
const CPF = process.env.QA_CPF ?? "529.982.247-25";

const main = async (): Promise<void> => {
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
    requestInit: {
      headers: {
        "x-canna-user": "01HM0ACTOR0000000000000001",
        "x-canna-role": "DIRETORIA",
        "x-canna-association": "01HM0ASSOC0000000000000001",
      },
    },
  });
  const client = new Client({ name: "qa-register", version: "0.0.0" });
  await client.connect(transport);

  const tools = await client.listTools();
  const hasTool = tools.tools.some((t) => t.name === "register_member");
  process.stderr.write(`register_member in tools/list: ${String(hasTool)}\n`);

  const res = await client.callTool({
    name: "register_member",
    arguments: { cpf: CPF },
  });
  const content = (res.content as Array<{ type: string; text: string }>)[0];
  process.stdout.write(`${content?.text ?? "(no content)"}\n`);
  await client.close();
};

main().catch((e) => {
  process.stderr.write(`FATAL: ${String(e)}\n`);
  process.exit(1);
});
