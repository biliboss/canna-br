/**
 * Kanban widget kit — shared contract + deterministic data helpers.
 *
 * A WidgetDef is the single unit the MCP server iterates over: it produces
 *   - one tool   (name → returns text summary + structuredContent + ui/resourceUri)
 *   - one resource (ui://kanban/<slug> → self-contained MCP-App HTML)
 *
 * Data flows two ways into the iframe:
 *   1. baked: buildData(defaults) is JSON-injected as __DATA__ so the widget
 *      renders standalone (preview / gallery / QA, no model round-trip).
 *   2. live:  the host pushes the real tool result via ui/notifications/tool-result;
 *      the bridge re-fires onData(result) and the widget re-renders idempotently.
 */
import type { ZodRawShape } from "zod";

export const MCP_APP_MIME = "text/html;profile=mcp-app";

// Known categories of the reference kit; any string is allowed so a library
// can grow into new domains (e.g. "operations", "sales") without a type change.
export type WidgetCategory =
  | "metrics"
  | "flow"
  | "flight-levels"
  | (string & {});

export interface WidgetDef {
  /** tool name, snake_case */
  name: string;
  /** human-facing title (shown in widget header + gallery) */
  title: string;
  /** model-facing tool description */
  description: string;
  category: WidgetCategory;
  /** zod raw shape for the tool input */
  inputShape: ZodRawShape;
  /** ui://kanban/<slug> */
  resourceUri: string;
  /** resource registration slug */
  resourceName: string;
  /** args → data object (synthesize deterministically when args absent) */
  buildData: (args: Record<string, unknown>) => Record<string, unknown>;
  /** data → short text the model reads (the tool's text content) */
  summary: (data: Record<string, unknown>) => string;
  /** data → full self-contained HTML document */
  html: (data: Record<string, unknown>) => string;
  /** resource _meta passthrough (csp / prefersBorder) */
  meta?: Record<string, unknown>;
  /** semver of this app in the library; defaults to 0.1.0 in the index */
  version?: string;
  /** lifecycle status in the library; defaults to "stable" */
  status?: "experimental" | "beta" | "stable" | "deprecated";
  /** ISO date the app entered the library (optional; informational) */
  added?: string;
}

// ── deterministic RNG (mulberry32) ──────────────────────────────────────────
// Stable synthetic data → stable screenshots / QA. Seed per widget.

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** integer in [min, max] inclusive */
export function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** pick one element */
export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

// ── statistics ──────────────────────────────────────────────────────────────

export function sortAsc(a: readonly number[]): number[] {
  return [...a].sort((x, y) => x - y);
}

/** p in 0..100; nearest-rank on a sorted-ascending array. */
export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (p <= 0) return sorted[0]!;
  if (p >= 100) return sorted[sorted.length - 1]!;
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(rank, sorted.length) - 1]!;
}

export function mean(a: readonly number[]): number {
  if (a.length === 0) return 0;
  return a.reduce((s, x) => s + x, 0) / a.length;
}

export function median(a: readonly number[]): number {
  return percentile(sortAsc(a), 50);
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ── dates (ISO yyyy-mm-dd, UTC-noon anchored to dodge DST drift) ─────────────

export function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseIso(iso: string): Date {
  return new Date(iso + "T12:00:00Z");
}

export function addDays(iso: string, n: number): string {
  const d = parseIso(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}

export function daysBetween(aIso: string, bIso: string): number {
  return Math.round(
    (parseIso(bIso).getTime() - parseIso(aIso).getTime()) / 86400000,
  );
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "Jun 03" */
export function fmtDay(iso: string): string {
  const d = parseIso(iso);
  return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Default "today" for deterministic generation (currentDate of the vault). */
export const ANCHOR = "2026-06-10";

// ── Monte Carlo (resampling historical daily throughput) ─────────────────────

/**
 * How-many: simulate `days` into the future `runs` times, summing a random
 * daily throughput draw each day. Returns sorted-ascending completed counts.
 */
export function monteCarloHowMany(
  throughputSamples: readonly number[],
  days: number,
  runs: number,
  rng: () => number,
): number[] {
  const out: number[] = [];
  const n = throughputSamples.length;
  if (n === 0) return out;
  for (let r = 0; r < runs; r++) {
    let done = 0;
    for (let d = 0; d < days; d++) {
      done += throughputSamples[Math.floor(rng() * n)]!;
    }
    out.push(done);
  }
  return sortAsc(out);
}

/**
 * When: simulate how many days to clear `backlog` items, `runs` times,
 * drawing a random daily throughput until the backlog is exhausted.
 * Returns sorted-ascending day counts.
 */
export function monteCarloWhen(
  throughputSamples: readonly number[],
  backlog: number,
  runs: number,
  rng: () => number,
): number[] {
  const out: number[] = [];
  const n = throughputSamples.length;
  if (n === 0 || backlog <= 0) return out;
  for (let r = 0; r < runs; r++) {
    let remaining = backlog;
    let day = 0;
    // guard against all-zero draws → cap at a large horizon
    while (remaining > 0 && day < 5000) {
      remaining -= throughputSamples[Math.floor(rng() * n)]!;
      day++;
    }
    out.push(day);
  }
  return sortAsc(out);
}

// ── histogram binning ─────────────────────────────────────────────────────────

export interface Bin {
  x0: number;
  x1: number;
  count: number;
  /** representative label, e.g. "3" or "3–4" */
  label: string;
}

/** Integer-valued histogram: one bin per integer value in [min,max]. */
export function binIntegers(values: readonly number[]): Bin[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const bins: Bin[] = [];
  for (let v = min; v <= max; v++) {
    bins.push({ x0: v, x1: v + 1, count: 0, label: String(v) });
  }
  for (const v of values) bins[v - min]!.count++;
  return bins;
}
