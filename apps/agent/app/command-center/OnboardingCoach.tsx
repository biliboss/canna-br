"use client";

import { useState } from "react";
import type { CommandCenterConfig } from "./types";

/**
 * OnboardingCoach — the menu IS the onboarding. Instead of a modal tour, a
 * small non-modal card teaches one thing at a time, just-in-time, and only
 * advances when the user actually does it (the stage's `doneWhen` predicate
 * over their metrified stats flips true).
 */
export function OnboardingCoach({
  config,
  stageIdx,
  onLaunch,
  onDismiss,
}: {
  config: CommandCenterConfig;
  stageIdx: number;
  onLaunch: (prompt: string, ref: string) => void;
  onDismiss: () => void;
}) {
  const [dismissed, setDismissed] = useState<number | null>(null);
  const stages = config.onboarding ?? [];

  if (stageIdx < 0) return null; // every stage cleared — the coach retires
  const stage = stages[stageIdx];
  if (!stage || dismissed === stage.id) return null;

  return (
    <aside className="cc-coach" role="status" aria-live="polite">
      <div className="cc-coach-prog" aria-hidden>
        {stages.map((s, i) => (
          <span
            key={s.id}
            className={`cc-coach-dot${i < stageIdx ? " is-done" : ""}${i === stageIdx ? " is-now" : ""}`}
          />
        ))}
      </div>
      <div className="cc-coach-body">
        <strong className="cc-coach-title">{stage.title}</strong>
        <p className="cc-coach-hint">{stage.hint}</p>
        {stage.cta && (
          <button
            className="cc-coach-cta"
            onClick={() => {
              if (stage.cta?.prompt) onLaunch(stage.cta.prompt, `coach-${stage.id}`);
            }}
          >
            {stage.cta.label}
          </button>
        )}
      </div>
      <button
        className="cc-coach-x"
        aria-label="Dispensar dica"
        onClick={() => {
          setDismissed(stage.id);
          onDismiss();
        }}
      >
        ✕
      </button>
    </aside>
  );
}
