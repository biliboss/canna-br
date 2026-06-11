"use client";

/**
 * user-context — the stateful, metrified USER ledger.
 *
 * This is the /manager premise applied to the end user: just as the fleet
 * ledger records one row per agent turn so the coordinator can predict + steer,
 * we record one row per user action (launch, open palette, dismiss) so the menu
 * can (1) PREDICT the next best action via frecency and (2) drive a game-style
 * onboarding that reveals complexity only as the user earns it.
 *
 * ─── Storage adapter seam ───────────────────────────────────────────────────
 *
 * The storage backend is PLUGGABLE via `CCStorageAdapter`. This is the seam
 * where canna-br's app attaches to the shared /manager ledger: the same
 * interaction events (launches, palette opens, notification taps) that power
 * local frecency prediction can be persisted to the fleet-coordinator's ledger
 * (principal=user), enabling server-computed signals, cross-device prediction,
 * and analytics — WITHOUT touching any UI component. The UI always calls
 * `adapter.load()` + `adapter.append()` and is unaware of where data lives.
 *
 * Built-in adapters:
 *   - `localStorageAdapter` — default, works offline, zero config.
 *   - `managerAdapter`      — stub for the /manager backend integration.
 *     Selected when NEXT_PUBLIC_CC_BACKEND === "manager".
 *     `append` fires-and-forgets a POST to NEXT_PUBLIC_CC_INGEST_URL (no-op if
 *     unset). `load` falls through to localStorage while the server side is
 *     stubbed. Never throws — degrades to localStorage on any failure.
 *
 * To wire a real manager backend:
 *   1. Implement `NEXT_PUBLIC_CC_INGEST_URL` as a POST /api/cc-events endpoint
 *      (manager-ledger compatible: { principal, event } body).
 *   2. Implement GET NEXT_PUBLIC_CC_INGEST_URL to return historical events for
 *      the authenticated user (for cross-device sync).
 *   3. Set NEXT_PUBLIC_CC_BACKEND=manager in the deployment env.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  CommandCenterConfig,
  Predicted,
  UserStats,
} from "./types";

// ── Event types ────────────────────────────────────────────────────────────

export type CCEventKind =
  | "launch" // user ran an app/prompt (the agent then calls the tool)
  | "launch_from_palette"
  | "open_palette"
  | "open_notifications"
  | "dismiss_notification"
  | "dismiss_coach";

export type CCEvent = { t: number; kind: CCEventKind; ref?: string };

// ── Storage adapter interface ──────────────────────────────────────────────

/**
 * CCStorageAdapter — the pluggable backend contract for the user-event ledger.
 *
 * Intentionally minimal: the hook is sync-first (localStorage) and
 * async-ready (manager server). `load` is called once on mount; `append` is
 * called on every user action. Neither method must throw — catch internally
 * and degrade gracefully.
 */
export interface CCStorageAdapter {
  /**
   * Load the event log. May be sync (returns CCEvent[]) or async (returns
   * Promise<CCEvent[]>). The hook handles both via Promise.resolve().
   */
  load(): CCEvent[] | Promise<CCEvent[]>;

  /**
   * Append one event. Fire-and-forget for async adapters — the UI does not
   * await this. Failures must be swallowed; never reject.
   */
  append(e: CCEvent): void | Promise<void>;
}

// ── Built-in adapters ──────────────────────────────────────────────────────

const LS_KEY = "cc-events-v1";
const CAP = 500;

/**
 * localStorageAdapter — default. Works offline, zero config.
 * Capped at 500 events (rolling window) to stay within quota.
 */
export const localStorageAdapter: CCStorageAdapter = {
  load(): CCEvent[] {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw) as unknown;
      return Array.isArray(arr) ? (arr as CCEvent[]) : [];
    } catch {
      return [];
    }
  },

  append(e: CCEvent): void {
    try {
      const existing = localStorageAdapter.load();
      const next = [...(existing as CCEvent[]), e];
      localStorage.setItem(LS_KEY, JSON.stringify(next.slice(-CAP)));
    } catch {
      /* private mode / storage quota — degrade to in-memory only */
    }
  },
};

/**
 * managerAdapter — stub for /manager ledger integration.
 *
 * Current behaviour (v0.1 stub):
 *   - `load`:   reads from localStorage (same as localStorageAdapter).
 *               TODO: GET NEXT_PUBLIC_CC_INGEST_URL for cross-device events.
 *   - `append`: writes to localStorage AND fires-and-forgets a POST to
 *               NEXT_PUBLIC_CC_INGEST_URL (no-op when env is unset).
 *
 * Intent: once NEXT_PUBLIC_CC_INGEST_URL is implemented on the manager side,
 * this adapter ships interaction events to the shared fleet ledger —
 * principal=user, enabling server-computed frecency predictions, cross-device
 * sync, and analytics pipeline (same event shape the fleet coordinator reads).
 * Zero UI changes required: only the adapter code changes.
 */
export const managerAdapter: CCStorageAdapter = {
  load(): CCEvent[] {
    // For now: localStorage fallback (stub — no server GET yet).
    // TODO: fetch GET ${process.env.NEXT_PUBLIC_CC_INGEST_URL}?principal=<userId>
    //       and merge with local events for cross-device prediction.
    return localStorageAdapter.load() as CCEvent[];
  },

  append(e: CCEvent): void {
    // Always write locally first so prediction works offline.
    localStorageAdapter.append(e);

    // Fire-and-forget to manager ingest endpoint (no-op if unset).
    const ingestUrl =
      typeof process !== "undefined"
        ? (process.env["NEXT_PUBLIC_CC_INGEST_URL"] ?? "")
        : "";
    if (!ingestUrl) return;

    // Best-effort POST — never throws, never blocks the UI.
    void fetch(ingestUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      // Shape matches the /manager ledger event contract.
      body: JSON.stringify({
        principal: "user", // TODO: inject authenticated user id
        event: e,
      }),
    }).catch(() => {
      /* network failure — already persisted locally, safe to ignore */
    });
  },
};

// ── Adapter picker ─────────────────────────────────────────────────────────

function pickAdapter(): CCStorageAdapter {
  if (
    typeof process !== "undefined" &&
    process.env["NEXT_PUBLIC_CC_BACKEND"] === "manager"
  ) {
    return managerAdapter;
  }
  return localStorageAdapter;
}

// ── Internal helpers ────────────────────────────────────────────────────────

const HALF_LIFE_H = 36; // recency decay: an action is "worth half" after 36h

/** Recency-weighted frecency: recent + repeated actions score highest. */
function frecencyMap(events: CCEvent[], now: number): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of events) {
    if (e.kind !== "launch" && e.kind !== "launch_from_palette") continue;
    if (!e.ref) continue;
    const ageH = Math.max(0, (now - e.t) / 3_600_000);
    const w = Math.pow(0.5, ageH / HALF_LIFE_H);
    m.set(e.ref, (m.get(e.ref) ?? 0) + w);
  }
  return m;
}

function deriveStats(events: CCEvent[]): UserStats {
  const appsUsed = new Set<string>();
  let launches = 0;
  let openedPalette = false;
  let launchedFromPalette = false;
  let openedNotifications = false;
  for (const e of events) {
    if (e.kind === "launch" || e.kind === "launch_from_palette") {
      launches++;
      if (e.ref) appsUsed.add(e.ref);
    }
    if (e.kind === "open_palette") openedPalette = true;
    if (e.kind === "launch_from_palette") launchedFromPalette = true;
    if (e.kind === "open_notifications") openedNotifications = true;
  }
  return {
    launches,
    distinctApps: appsUsed.size,
    appsUsed: [...appsUsed],
    openedPalette,
    launchedFromPalette,
    openedNotifications,
  };
}

// ── Public hook ────────────────────────────────────────────────────────────

export type UserContext = {
  stats: UserStats;
  /** Append one metrified event and persist via the active adapter. */
  log: (kind: CCEventKind, ref?: string) => void;
  /** Top-N predicted next actions (frecency → starter → config order). */
  predict: (config: CommandCenterConfig, n?: number) => Predicted[];
  /** Index of the current onboarding stage (0-based); -1 when all complete. */
  currentStageIndex: (config: CommandCenterConfig) => number;
  /** True until the user clears every onboarding stage. */
  onboarding: boolean;
  ready: boolean;
};

/**
 * useUserContext — client hook. SSR-safe: starts empty, hydrates from the
 * active adapter after mount so the server and first client render match.
 *
 * The adapter is selected from env at call time — no props needed.
 */
export function useUserContext(): UserContext {
  const [events, setEvents] = useState<CCEvent[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const adapter = pickAdapter();
    void Promise.resolve(adapter.load()).then((loaded) => {
      setEvents(loaded);
      setReady(true);
    });
  }, []);

  const log = useCallback((kind: CCEventKind, ref?: string) => {
    setEvents((prev) => {
      const e: CCEvent = { t: Date.now(), kind, ref };
      // Fire-and-forget adapter append — UI state is sync-first.
      const adapter = pickAdapter();
      void Promise.resolve(adapter.append(e)).catch(() => {
        /* adapter errors must never surface to the UI */
      });
      return [...prev, e];
    });
  }, []);

  const stats = useMemo(() => deriveStats(events), [events]);

  const predict = useCallback(
    (config: CommandCenterConfig, n = 4): Predicted[] => {
      const now = ready ? Date.now() : 0;
      const freq = frecencyMap(events, now);
      const stageIdx = onboardingIndex(config, stats);

      const apps = config.apps.filter((a) => unlocked(a.unlockStage, stageIdx));
      const prompts = config.prompts.filter((p) =>
        unlocked(p.unlockStage, stageIdx),
      );

      const scored = [
        ...apps.map((a, i) => ({
          id: a.id,
          title: a.title,
          prompt: a.prompt,
          icon: a.icon,
          kind: "app" as const,
          order: i,
          score: freq.get(a.id) ?? 0,
          starter: a.starter ?? false,
        })),
        ...prompts.map((p, i) => ({
          id: p.id,
          title: p.label,
          prompt: p.prompt,
          icon: p.icon,
          kind: "prompt" as const,
          order: 1000 + i,
          score: freq.get(p.id) ?? 0,
          starter: false,
        })),
      ];

      const hasHistory = scored.some((s) => s.score > 0);
      if (!hasHistory) {
        return scored
          .slice()
          .sort(
            (a, b) =>
              Number(b.starter) - Number(a.starter) || a.order - b.order,
          )
          .slice(0, n)
          .map((s) => ({
            id: s.id,
            title: s.title,
            prompt: s.prompt,
            icon: s.icon,
            kind: s.kind,
            reason: s.starter ? ("starter" as const) : ("time" as const),
          }));
      }

      return scored
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score || a.order - b.order)
        .slice(0, n)
        .map((s) => ({
          id: s.id,
          title: s.title,
          prompt: s.prompt,
          icon: s.icon,
          kind: s.kind,
          reason: "frecency" as const,
        }));
    },
    [events, ready, stats],
  );

  const currentStageIndex = useCallback(
    (config: CommandCenterConfig) => onboardingIndex(config, stats),
    [stats],
  );

  const onboarding = useMemo(() => true, []);

  return { stats, log, predict, currentStageIndex, onboarding, ready };
}

function unlocked(unlockStage: number | undefined, stageIdx: number): boolean {
  if (!unlockStage) return true;
  if (stageIdx === -1) return true;
  return stageIdx >= unlockStage;
}

/** First stage whose predicate is still false; -1 when all complete. */
export function onboardingIndex(
  config: CommandCenterConfig,
  stats: UserStats,
): number {
  const stages = config.onboarding ?? [];
  for (let i = 0; i < stages.length; i++) {
    if (!stages[i]!.doneWhen(stats)) return i;
  }
  return -1;
}
