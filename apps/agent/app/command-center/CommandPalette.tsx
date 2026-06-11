"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import type { CommandCenterConfig, Predicted } from "./types";

/**
 * CommandPalette — ⌘K full discoverability. Everything the deployment can do,
 * in one searchable surface: predicted ("Para você") first, then Apps, Prompts,
 * Navigation. Selecting an item launches it (the agent calls the tool → the MCP
 * App renders inline) and closes the palette.
 */
export function CommandPalette({
  open,
  onOpenChange,
  config,
  predicted,
  stageIdx,
  docsHref,
  onLaunch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: CommandCenterConfig;
  predicted: Predicted[];
  /** Current onboarding stage; gates locked apps/prompts. -1 = all unlocked. */
  stageIdx: number;
  /** Resolved docs URL (prop wins over config.docsHref). */
  docsHref?: string;
  onLaunch: (prompt: string, ref: string, fromPalette: boolean) => void;
}) {
  const docs = docsHref ?? config.docsHref;
  const unlocked = (s?: number) =>
    !s || stageIdx === -1 || stageIdx >= s;

  const apps = config.apps.filter((a) => unlocked(a.unlockStage));
  const prompts = config.prompts.filter((p) => unlocked(p.unlockStage));
  const run = (prompt: string, ref: string) => {
    onLaunch(prompt, ref, true);
    onOpenChange(false);
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command Center"
      description="Busque apps, prompts e ações"
      className="cc-palette"
    >
      <CommandInput placeholder="Busque um app, prompt ou ação…" />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>

        {predicted.length > 0 && (
          <>
            <CommandGroup heading="Para você">
              {predicted.map((p) => (
                <CommandItem
                  key={`pred-${p.kind}-${p.id}`}
                  value={`para-voce ${p.title}`}
                  onSelect={() => run(p.prompt, p.id)}
                >
                  <span className="cc-ic" aria-hidden>
                    {p.icon ?? "✨"}
                  </span>
                  <span className="cc-it">{p.title}</span>
                  <CommandShortcut>
                    {p.reason === "frecency" ? "recente" : "sugerido"}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Apps">
          {apps.map((a) => (
            <CommandItem
              key={a.id}
              value={`app ${a.title} ${a.description ?? ""} ${(a.keywords ?? []).join(" ")}`}
              onSelect={() => run(a.prompt, a.id)}
            >
              <span className="cc-ic" aria-hidden>
                {a.icon ?? "▦"}
              </span>
              <span className="cc-it">{a.title}</span>
              {a.description && <span className="cc-id">{a.description}</span>}
            </CommandItem>
          ))}
        </CommandGroup>

        {prompts.length > 0 && (
          <CommandGroup heading="Prompts">
            {prompts.map((p) => (
              <CommandItem
                key={p.id}
                value={`prompt ${p.label} ${(p.keywords ?? []).join(" ")}`}
                onSelect={() => run(p.prompt, p.id)}
              >
                <span className="cc-ic" aria-hidden>
                  {p.icon ?? "➤"}
                </span>
                <span className="cc-it">{p.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandGroup heading="Navegação">
          <CommandItem
            value="nova conversa new thread limpar"
            onSelect={() => {
              window.dispatchEvent(new CustomEvent("cc:new-thread"));
              onOpenChange(false);
            }}
          >
            <span className="cc-ic" aria-hidden>
              ✚
            </span>
            <span className="cc-it">Nova conversa</span>
          </CommandItem>
          {docs && (
            <CommandItem
              value="documentação docs ajuda help"
              onSelect={() => {
                window.open(docs, "_blank", "noopener");
                onOpenChange(false);
              }}
            >
              <span className="cc-ic" aria-hidden>
                📖
              </span>
              <span className="cc-it">Documentação</span>
              <CommandShortcut>↗</CommandShortcut>
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
