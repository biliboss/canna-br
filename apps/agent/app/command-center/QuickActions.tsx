"use client";

import type { Predicted } from "./types";

/**
 * QuickActions — the contextual strip that replaces the old flat suggestion
 * pills. It shows the PREDICTED next actions for this user (frecency on a warm
 * start, curated starters on a cold one), plus a persistent "⌘K para tudo"
 * affordance so discovery is always one key away.
 */
export function QuickActions({
  predicted,
  onLaunch,
  onOpenPalette,
  heading = "Para você",
}: {
  predicted: Predicted[];
  onLaunch: (prompt: string, ref: string) => void;
  onOpenPalette: () => void;
  heading?: string;
}) {
  if (predicted.length === 0) {
    return (
      <div className="cc-quick" role="group" aria-label="Ações rápidas">
        <button className="cc-chip cc-chip--ghost" onClick={onOpenPalette}>
          <span aria-hidden>⌘K</span> Descobrir apps e prompts
        </button>
      </div>
    );
  }

  return (
    <div className="cc-quick" role="group" aria-label={heading}>
      <span className="cc-quick-label">{heading}</span>
      {predicted.map((p) => (
        <button
          key={`${p.kind}-${p.id}`}
          className="cc-chip"
          onClick={() => onLaunch(p.prompt, p.id)}
          title={p.title}
        >
          <span aria-hidden className="cc-chip-ic">
            {p.icon ?? (p.kind === "app" ? "▦" : "➤")}
          </span>
          {p.title}
        </button>
      ))}
      <button
        className="cc-chip cc-chip--ghost"
        onClick={onOpenPalette}
        aria-label="Abrir paleta de comandos"
      >
        <span aria-hidden>⌘K</span> tudo
      </button>
    </div>
  );
}
