"use client";

import { useEffect, useState } from "react";
import { Assistant } from "./assistant";
import { CANNA_COMMAND_CENTER } from "./command-center.config";

/**
 * Playground — canna-br Command Center host.
 * Model select + BYOK OpenRouter key. Default: Gemini Flash Lite.
 * In dev the server env key is used when the field is empty.
 */
const MODELS = [
  { id: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku" },
  { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o mini" },
  { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
];

// Context: canna-br association admin agent — primed on its apps, calls tools
// to render micro-apps inline. LGPD: never expose CPF or full name.
const SYSTEM = [
  "Você é o assistente administrativo de uma associação de cannabis medicinal no sistema canna-br (BR, sandbox ANVISA RDC 1.014).",
  "Ao responder qualquer pedido sobre membros, cotas, estoque/lotes, dispensações, SNGPC ou prescrições, USE SEMPRE a ferramenta correspondente — ela renderiza o painel interativo (MCP App) na conversa.",
  "Responda em português, conciso e operacional. LGPD: nunca exponha CPF completo ou nome completo — só iniciais + hash.",
].join(" ");

const DOCS_HREF =
  process.env.NEXT_PUBLIC_DOCS_URL ?? "http://127.0.0.1:4336/apps/";

export function Playground() {
  const [model, setModel] = useState(MODELS[0]!.id);
  const [keyInput, setKeyInput] = useState("");
  const [applied, setApplied] = useState({ model: MODELS[0]!.id, apiKey: "" });

  useEffect(() => {
    try {
      const m = localStorage.getItem("aui-model");
      const k = localStorage.getItem("aui-key") ?? "";
      if (m) setModel(m);
      setKeyInput(k);
      setApplied({ model: m || MODELS[0]!.id, apiKey: k });
    } catch {
      /* ignore */
    }
  }, []);

  const apply = () => {
    try {
      localStorage.setItem("aui-model", model);
      localStorage.setItem("aui-key", keyInput);
    } catch {
      /* ignore */
    }
    setApplied({ model, apiKey: keyInput.trim() });
  };

  const dirty = model !== applied.model || keyInput.trim() !== applied.apiKey;

  return (
    <div className="flex h-dvh flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b bg-background px-4 py-2 text-sm">
        <span className="mr-auto font-semibold tracking-tight">
          canna-br · Assistente
        </span>
        <label className="text-muted-foreground" htmlFor="pg-model">
          Modelo
        </label>
        <select
          id="pg-model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="rounded-md border bg-transparent px-2 py-1"
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <input
          type="password"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder="sk-or-…  (sua OpenRouter key — opcional em dev)"
          aria-label="OpenRouter API key"
          className="w-72 rounded-md border bg-transparent px-2 py-1"
        />
        <button
          onClick={apply}
          disabled={!dirty}
          className="rounded-md bg-primary px-3 py-1 font-medium text-primary-foreground disabled:opacity-50"
        >
          {dirty ? "Aplicar" : "Aplicado"}
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <Assistant
          key={`${applied.model}:${applied.apiKey ? "byok" : "env"}`}
          model={applied.model}
          apiKey={applied.apiKey}
          system={SYSTEM}
          commandCenter={CANNA_COMMAND_CENTER}
          docsHref={DOCS_HREF}
        />
      </div>
    </div>
  );
}
