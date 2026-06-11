"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Kbd } from "@/components/ui/kbd";
import { CommandPalette } from "./CommandPalette";
import { NotificationCenter } from "./NotificationCenter";
import { OnboardingCoach } from "./OnboardingCoach";
import { QuickActions } from "./QuickActions";
import { useUserContext } from "./user-context";
import type { CommandCenterConfig } from "./types";
import "./command-center.css";

/**
 * CommandCenter — the single menu surface. Owns the user-context ledger and
 * wires every sub-surface to it:
 *   • the top bar (context chip + ⌘K search + notification bell + docs link)
 *   • the contextual quick-actions strip (predicted next actions)
 *   • the ⌘K command palette (full discoverability)
 *   • the floating notification center (each notification → an MCP App)
 *   • the staged onboarding coach
 *
 * `onLaunch(prompt)` is the one bridge to the agent: it appends a user message
 * to the thread, the agent calls the matching tool, and the MCP App renders
 * inline. Every launch is logged to the ledger so predictions + onboarding
 * improve as the user works.
 */
export function CommandCenter({
  config,
  onLaunch,
  leading,
  docsHref,
}: {
  config: CommandCenterConfig;
  onLaunch: (prompt: string) => void;
  /** Header-left slot (e.g. the sidebar trigger + separator). */
  leading?: ReactNode;
  docsHref?: string;
}) {
  const ctx = useUserContext();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const predicted = useMemo(() => ctx.predict(config, 4), [ctx, config]);
  const stageIdx = ctx.currentStageIndex(config);

  const launch = useCallback(
    (prompt: string, ref: string, fromPalette = false) => {
      onLaunch(prompt);
      ctx.log(fromPalette ? "launch_from_palette" : "launch", ref);
    },
    [onLaunch, ctx],
  );

  const openPalette = useCallback(() => {
    setPaletteOpen(true);
    ctx.log("open_palette");
  }, [ctx]);

  // ⌘K / Ctrl-K toggles the palette from anywhere — discovery is one key away.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => {
          if (!o) ctx.log("open_palette");
          return !o;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ctx]);

  const resolvedDocs = docsHref ?? config.docsHref;

  return (
    <>
      <div className="cc-bar">
        {leading}
        <span className="cc-context">
          <span className="cc-context-dot" aria-hidden />
          {config.contextLabel}
        </span>
        <div className="cc-bar-actions">
          <button
            className="cc-search"
            onClick={openPalette}
            aria-label="Abrir paleta de comandos (Command-K)"
          >
            <span aria-hidden className="cc-search-ic">
              🔎
            </span>
            <span className="cc-search-txt">Buscar tudo</span>
            <Kbd className="cc-search-kbd">⌘K</Kbd>
          </button>
          <NotificationCenter
            notifications={config.notifications ?? []}
            onLaunch={(p, r) => launch(p, r, false)}
            onOpen={() => ctx.log("open_notifications")}
          />
          {resolvedDocs && (
            <a
              className="cc-docs"
              href={resolvedDocs}
              target="_blank"
              rel="noopener noreferrer"
            >
              Documentação →
            </a>
          )}
        </div>
      </div>

      <QuickActions
        predicted={predicted}
        onLaunch={(p, r) => launch(p, r, false)}
        onOpenPalette={openPalette}
      />

      <CommandPalette
        open={paletteOpen}
        onOpenChange={(o) => {
          setPaletteOpen(o);
          if (o) ctx.log("open_palette");
        }}
        config={config}
        predicted={predicted}
        stageIdx={stageIdx}
        docsHref={resolvedDocs}
        onLaunch={launch}
      />

      <OnboardingCoach
        config={config}
        stageIdx={stageIdx}
        onLaunch={(p, r) => launch(p, r, false)}
        onDismiss={() => ctx.log("dismiss_coach")}
      />
    </>
  );
}
