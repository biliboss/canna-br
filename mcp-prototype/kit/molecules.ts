/**
 * MOLECULES_CSS — composed components + chart SVG styling.
 *
 * Design decisions:
 *   - Statcard: dark = elevated bg (card > background); light = white + shadow.
 *     Sparkline slot aligns right, never stretches vertically.
 *   - Chart bands: opacity 0.92 (was 0.9) — slightly more opaque for CFD readability.
 *     Band stroke matches background so seams between stacks read as subtle hairlines.
 *   - Rules: p85 = amber full-opacity stroke; p95 = red full-opacity stroke (warning/danger
 *     must be immediately legible, unlike regular grid lines).
 *   - Tooltip: frosted glass via backdrop-filter (works in CSP-sandboxed iframe).
 *   - Board cardlet: left-accent 3px, hover = translateY(-1px) + shadow (Linear card pattern).
 *   - Segment control: pill-selected via inset shadow, not background swap alone.
 */
export const MOLECULES_CSS = `
/* ── KPI grid + statcard ─────────────────────────────────────────────────── */
.aui-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 130px), 1fr));
  gap: var(--space-3);
}
.aui-statcard {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  box-shadow: var(--shadow);
  overflow: hidden; /* clips sparkline SVG overflow:visible paths */
  transition: box-shadow 0.15s ease-out, transform 0.12s ease-out;
}
.aui-statcard:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-1px);
}
.aui-statcard__row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-2);
}
.aui-statcard__spark {
  opacity: 0.85;
  flex-shrink: 0;
  /* Constrain sparkline host — prevents SVG style.width:100% from expanding */
  width: 64px;
  overflow: hidden;
}
.aui-statcard__spark svg {
  display: block;
  width: 64px !important;
  height: 26px !important;
}

/* ── legend ──────────────────────────────────────────────────────────────── */
.aui-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
  font-size: var(--text-xs);
  color: var(--muted-foreground);
}
.aui-legend__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: default;
}
.aui-legend__swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
  flex-shrink: 0;
}

/* ── tooltip ─────────────────────────────────────────────────────────────────
 * Frosted glass effect — backdrop-filter blur works in CSP-sandboxed iframes.
 * Position is managed by charts.ts (fixed, pointer-events: none). */
.aui-tooltip {
  background: color-mix(in oklch, var(--card) 90%, transparent);
  backdrop-filter: blur(12px) saturate(1.5);
  -webkit-backdrop-filter: blur(12px) saturate(1.5);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  font-size: var(--text-xs);
  line-height: 1.55;
  box-shadow: var(--shadow-lg);
  max-width: 240px;
  pointer-events: none;
}
.aui-tooltip b   { font-weight: 700; }
.aui-tooltip .k  { color: var(--muted-foreground); font-weight: 500; }
.aui-tooltip hr  { border: none; border-top: 1px solid var(--border); margin: 5px 0; }

/* ── empty state ─────────────────────────────────────────────────────────── */
.aui-empty {
  color: var(--muted-foreground);
  font-size: var(--text-sm);
  text-align: center;
  padding: var(--space-6);
  line-height: 1.6;
}

/* ── controls ────────────────────────────────────────────────────────────── */
.aui-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
}
.aui-segment {
  display: inline-flex;
  background: var(--muted);
  border-radius: var(--radius-sm);
  padding: 2px;
  gap: 1px;
  border: 1px solid var(--border);
}
.aui-segment__btn {
  border: 0;
  background: transparent;
  color: var(--muted-foreground);
  font: inherit;
  font-size: var(--text-xs);
  font-weight: 550;
  padding: 4px 10px;
  border-radius: calc(var(--radius-sm) - 2px);
  cursor: pointer;
  transition: background 0.12s, color 0.12s, box-shadow 0.12s;
  white-space: nowrap;
}
.aui-segment__btn:hover { color: var(--foreground); }
.aui-segment__btn.is-active {
  background: var(--card);
  color: var(--foreground);
  box-shadow: 0 1px 3px oklch(0 0 0 / 0.22), 0 0 0 1px var(--border);
}
.aui-segment__btn:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 1px;
}
.aui-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.aui-field__label {
  font-size: var(--text-xs);
  color: var(--muted-foreground);
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  letter-spacing: 0.01em;
}
.aui-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 999px;
  background: var(--muted);
  outline: none;
  cursor: pointer;
}
.aui-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
  border: 2px solid var(--card);
  box-shadow: 0 0 0 1px var(--primary);
  transition: box-shadow 0.12s;
}
.aui-slider:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--ring) 35%, transparent);
}
.aui-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--primary);
  cursor: pointer;
  border: 2px solid var(--card);
}

/* ── chart SVG ───────────────────────────────────────────────────────────────
 * All SVG elements emitted by charts.ts; styled here by class.
 * Grid: very subtle (opacity 0.4, dash 2 3) — structure without noise.
 * Rules: full-opacity stroke for warning/danger — must read over band fill.
 * Bands: slightly transparent so stroke seams show between CFD layers. */
/* overflow visible allows axes/labels to breathe outside chart bounds;
 * sparklines are clipped by their host via overflow:hidden */
.aui-chart { overflow: visible; }
.aui-spark { overflow: hidden; }

.aui-axis .aui-tick {
  fill: var(--muted-foreground);
  font-size: 10px;
  font-family: var(--font-sans);
  font-variant-numeric: tabular-nums;
}
.aui-tickline {
  stroke: var(--border);
  stroke-width: 1;
}
.aui-grid {
  stroke: var(--border);
  stroke-width: 1;
  stroke-dasharray: 2 3;
  opacity: 0.40;
}
.aui-axis-label {
  fill: var(--muted-foreground);
  font-size: 10px;
  font-family: var(--font-sans);
  font-weight: 600;
  letter-spacing: 0.04em;
}

/* lines + areas */
.aui-line {
  stroke: var(--chart-1);
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
  fill: none;
}
.aui-area {
  fill: var(--chart-1);
  opacity: 0.15;
}

/* CFD stacked bands — opacity 0.92 keeps colors vivid while seams stay legible */
.aui-band {
  stroke: var(--background);
  stroke-width: 0.75;
  opacity: 0.92;
}
.aui-band.s0 { fill: var(--chart-1); }
.aui-band.s1 { fill: var(--chart-2); }
.aui-band.s2 { fill: var(--chart-3); }
.aui-band.s3 { fill: var(--chart-4); }
.aui-band.s4 { fill: var(--chart-5); }
.aui-band.s5 { fill: var(--chart-6); }
.aui-band.s6 { fill: var(--chart-7); }
.aui-band.s7 { fill: var(--chart-8); }

/* bars */
.aui-bars { }
.aui-bar         { fill: var(--chart-1); }
.aui-bar.muted   { fill: var(--muted); }
.aui-bar.accent  { fill: var(--chart-2); }

/* scatter dots */
.aui-dots { }
.aui-dot {
  fill: var(--chart-1);
  opacity: 0.80;
  transition: opacity 0.10s, r 0.10s;
  cursor: pointer;
}
.aui-dot:hover        { opacity: 1; }
.aui-dot.at-risk      { fill: var(--at-risk); }
.aui-dot.blocked      { fill: var(--blocked); }
.aui-dot.on-track     { fill: var(--on-track); }

/* percentile / reference rules
 * Default = muted dashed; p85/warn = amber solid; p95/danger = red solid.
 * Solid stroke (no dash) for warning/danger so they override the grid visually. */
.aui-rule-line {
  stroke: var(--muted-foreground);
  stroke-width: 1;
  stroke-dasharray: 4 3;
  opacity: 0.60;
}
.aui-rule-label {
  fill: var(--muted-foreground);
  font-size: 9.5px;
  font-family: var(--font-sans);
  font-weight: 650;
}
.aui-rule.p85 .aui-rule-line,
.aui-rule.warn .aui-rule-line {
  stroke: var(--at-risk);
  stroke-dasharray: none;
  opacity: 1;
  stroke-width: 1.5;
}
.aui-rule.p95 .aui-rule-line,
.aui-rule.danger .aui-rule-line {
  stroke: var(--blocked);
  stroke-dasharray: none;
  opacity: 1;
  stroke-width: 1.5;
}
.aui-rule.p85 .aui-rule-label,
.aui-rule.warn .aui-rule-label   { fill: var(--at-risk); }
.aui-rule.p95 .aui-rule-label,
.aui-rule.danger .aui-rule-label { fill: var(--blocked); }

/* sparkline */
.aui-spark { display: block; }
.aui-spark .spark {
  stroke: var(--primary);
  stroke-width: 1.75;
  fill: none;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.aui-spark-end { fill: var(--primary); }

/* ── board organism ───────────────────────────────────────────────────────── */
.aui-board {
  display: flex;
  gap: var(--space-3);
  overflow-x: auto;
  padding-bottom: var(--space-3);
  /* overflow contract for iframe/generative UI */
  max-width: 100%;
}
.aui-col {
  flex: 1 1 0;
  min-width: 145px;
  background: var(--muted);
  border-radius: var(--radius);
  padding: var(--space-2);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  border: 1px solid var(--border);
}
.aui-col__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: 3px 5px;
}
.aui-col__title {
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted-foreground);
}
.aui-col__count {
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--muted-foreground);
  font-weight: 650;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0 6px;
  min-width: 20px;
  text-align: center;
}
.aui-col__count.over {
  color: var(--blocked);
  border-color: color-mix(in oklch, var(--blocked) 40%, transparent);
  background: color-mix(in oklch, var(--blocked) 12%, transparent);
}

/* cardlet — Linear-style: left accent 3px, hover lift + shadow */
.aui-cardlet {
  background: var(--card);
  border: 1px solid var(--border);
  border-left: 3px solid var(--cos-standard);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  transition: border-color 0.12s, transform 0.10s ease-out, box-shadow 0.12s ease-out;
}
.aui-cardlet:hover {
  border-color: color-mix(in oklch, var(--ring) 60%, var(--border));
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}
.aui-cardlet:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 1px;
}
.aui-cardlet.cos-expedite   { border-left-color: var(--cos-expedite); }
.aui-cardlet.cos-fixed-date { border-left-color: var(--cos-fixed-date); }
.aui-cardlet.cos-intangible { border-left-color: var(--cos-intangible); }
.aui-cardlet.blocked        { border-left-color: var(--blocked); }
.aui-cardlet__title {
  font-size: var(--text-sm);
  font-weight: 550;
  line-height: 1.35;
  margin-bottom: 5px;
}
.aui-cardlet__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
}

/* ── flight levels ───────────────────────────────────────────────────────── */
.aui-fl {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.aui-fl__lane {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-3) var(--space-4);
  background: var(--card);
  border-left-width: 3px;
  box-shadow: var(--shadow);
}
.aui-fl__lane.fl3 { border-left-color: var(--fl-3); }
.aui-fl__lane.fl2 { border-left-color: var(--fl-2); }
.aui-fl__lane.fl1 { border-left-color: var(--fl-1); }
.aui-fl__lane-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}
.aui-fl__lane-head h3 {
  font-size: var(--text-sm);
  font-weight: 700;
  letter-spacing: -0.01em;
}
.aui-fl__lane-head .sub {
  font-size: var(--text-xs);
  color: var(--muted-foreground);
}
.aui-fl__items {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
`;
