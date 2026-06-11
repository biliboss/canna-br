/**
 * ATOMS_CSS — atomic components.
 *
 * Design decisions:
 *   - Badge taxonomy: status badges use dot + tinted bg + colored border (3 cues, not 1).
 *     CoS badges use solid-fill left-accent pill. Category badges are capsule-label, no dot.
 *     Flight level badges use ring (outline) style to differentiate from status.
 *   - All interactive atoms: focus-visible 2px ring, 150ms ease-out transitions.
 *   - Stat values: tabular-nums, letter-spacing -0.03em (shadcn/Linear convention).
 *   - Card: dark = bg elevation only; light = shadow. Consistent with Linear/shadcn dark mode.
 *   - Button: three variants (primary/ghost/outline) with box-shadow transition.
 */
export const ATOMS_CSS = `
/* ── widget chrome ───────────────────────────────────────────────────────── */
.aui-widget {
  background: var(--background);
  padding: var(--space-5) var(--space-4);
  max-width: 760px;
  margin: 0 auto;
}
.aui-widget[data-wide] { max-width: none; }
.aui-widget__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}
.aui-widget__heading {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.aui-widget__title {
  font-size: var(--text-lg);
  font-weight: 650;
  letter-spacing: -0.025em;
  line-height: 1.25;
}
.aui-widget__subtitle {
  color: var(--muted-foreground);
  font-size: var(--text-sm);
  line-height: 1.4;
}
.aui-widget__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* ── badge / label ───────────────────────────────────────────────────────────
 * Visual taxonomy:
 *   status     — pill + filled dot + tinted bg + colored border  (3 simultaneous cues)
 *   class-of-service — solid-fill pill, no dot, uppercase tiny text
 *   flight-level — outline pill (ring only, transparent bg)
 *   category   — muted capsule, uppercase, no dot
 *   semantic   — neutral/primary/success/warning/destructive with dot
 * ────────────────────────────────────────────────────────────────────────── */
.aui-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: var(--text-xs);
  font-weight: 600;
  line-height: 1.5;
  letter-spacing: 0.01em;
  border: 1px solid var(--border);
  color: var(--muted-foreground);
  background: var(--muted);
  white-space: nowrap;
  vertical-align: middle;
}

/* default dot */
.aui-badge::before {
  content: "";
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

/* ── category — no dot, uppercase micro-label */
.aui-badge--category {
  text-transform: uppercase;
  letter-spacing: 0.07em;
  font-size: 0.625rem;
  font-weight: 700;
  background: transparent;
  border-color: var(--border);
  color: var(--muted-foreground);
}
.aui-badge--category::before { display: none; }

/* ── semantic variants (dot style) */
.aui-badge--neutral {
  color: var(--muted-foreground);
  background: var(--muted);
  border-color: var(--border);
}
.aui-badge--primary {
  color: var(--primary);
  background: color-mix(in oklch, var(--primary) 12%, transparent);
  border-color: color-mix(in oklch, var(--primary) 30%, transparent);
}
.aui-badge--success {
  color: var(--success);
  background: color-mix(in oklch, var(--success) 12%, transparent);
  border-color: color-mix(in oklch, var(--success) 28%, transparent);
}
.aui-badge--warning {
  color: var(--warning);
  background: color-mix(in oklch, var(--warning) 14%, transparent);
  border-color: color-mix(in oklch, var(--warning) 32%, transparent);
}
.aui-badge--destructive {
  color: var(--destructive);
  background: color-mix(in oklch, var(--destructive) 14%, transparent);
  border-color: color-mix(in oklch, var(--destructive) 32%, transparent);
}

/* ── status variants (kanban workflow states)
 * Same dot+tinted formula; each maps to its semantic color token.
 * The coloured border provides the 3rd visual cue for colorblind accessibility. */
.aui-badge--on-track {
  color: var(--on-track);
  background: color-mix(in oklch, var(--on-track) 12%, transparent);
  border-color: color-mix(in oklch, var(--on-track) 30%, transparent);
}
.aui-badge--at-risk {
  color: var(--at-risk);
  background: color-mix(in oklch, var(--at-risk) 14%, transparent);
  border-color: color-mix(in oklch, var(--at-risk) 34%, transparent);
}
.aui-badge--aging {
  color: var(--aging);
  background: color-mix(in oklch, var(--aging) 14%, transparent);
  border-color: color-mix(in oklch, var(--aging) 34%, transparent);
}
.aui-badge--blocked {
  color: var(--blocked);
  background: color-mix(in oklch, var(--blocked) 14%, transparent);
  border-color: color-mix(in oklch, var(--blocked) 34%, transparent);
}
.aui-badge--done {
  color: var(--done);
  background: color-mix(in oklch, var(--done) 14%, transparent);
  border-color: color-mix(in oklch, var(--done) 28%, transparent);
}

/* ── class-of-service variants
 * Solid fill + no dot = different visual language from status (priority signal, not state).
 * Uses more opaque fill so CoS reads as "category tag" not "status indicator". */
.aui-badge--expedite {
  color: var(--cos-expedite);
  background: color-mix(in oklch, var(--cos-expedite) 18%, transparent);
  border-color: color-mix(in oklch, var(--cos-expedite) 40%, transparent);
  font-weight: 700;
}
.aui-badge--fixed-date {
  color: var(--cos-fixed-date);
  background: color-mix(in oklch, var(--cos-fixed-date) 16%, transparent);
  border-color: color-mix(in oklch, var(--cos-fixed-date) 38%, transparent);
}
.aui-badge--standard {
  color: var(--cos-standard);
  background: color-mix(in oklch, var(--cos-standard) 12%, transparent);
  border-color: color-mix(in oklch, var(--cos-standard) 28%, transparent);
}
.aui-badge--intangible {
  color: var(--cos-intangible);
  background: color-mix(in oklch, var(--cos-intangible) 14%, transparent);
  border-color: color-mix(in oklch, var(--cos-intangible) 26%, transparent);
}

/* ── flight-level variants
 * Outline/ring style — transparent bg, colored border only.
 * Visual language = "level marker" (structural), distinct from status (workflow state). */
.aui-badge--fl1,
.aui-badge--fl2,
.aui-badge--fl3 {
  background: transparent;
  font-weight: 700;
  letter-spacing: 0.03em;
}
.aui-badge--fl1::before { display: none; }
.aui-badge--fl2::before { display: none; }
.aui-badge--fl3::before { display: none; }
.aui-badge--fl1 {
  color: var(--fl-1);
  border-color: color-mix(in oklch, var(--fl-1) 50%, transparent);
}
.aui-badge--fl2 {
  color: var(--fl-2);
  border-color: color-mix(in oklch, var(--fl-2) 50%, transparent);
}
.aui-badge--fl3 {
  color: var(--fl-3);
  border-color: color-mix(in oklch, var(--fl-3) 50%, transparent);
}

/* ── button ──────────────────────────────────────────────────────────────── */
.aui-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: 550;
  font-family: inherit;
  letter-spacing: 0.01em;
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--foreground);
  cursor: pointer;
  transition: background 0.15s ease-out,
              border-color 0.15s ease-out,
              box-shadow 0.15s ease-out,
              opacity 0.15s ease-out,
              transform 0.12s ease-out;
  user-select: none;
}
.aui-btn:hover {
  background: var(--accent);
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}
.aui-btn:active { transform: translateY(0); }
.aui-btn:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
.aui-btn:disabled { opacity: 0.45; cursor: default; pointer-events: none; }
.aui-btn--primary {
  background: var(--primary);
  color: var(--primary-foreground);
  border-color: transparent;
}
.aui-btn--primary:hover {
  background: color-mix(in oklch, var(--primary) 88%, var(--foreground));
  opacity: 1;
}
.aui-btn--ghost {
  background: transparent;
  border-color: transparent;
  color: var(--muted-foreground);
}
.aui-btn--ghost:hover {
  background: var(--accent);
  color: var(--foreground);
}
.aui-btn--sm {
  padding: 4px 10px;
  font-size: var(--text-xs);
  border-radius: calc(var(--radius-sm) - 1px);
}

/* ── card ────────────────────────────────────────────────────────────────── */
.aui-card {
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-4);
  box-shadow: var(--shadow);
}

/* ── stat ─────────────────────────────────────────────────────────────────
 * tabular-nums on all numeric values (Linear/Stripe dashboard convention).
 * letter-spacing -0.03em on large values prevents optical spreading. */
.aui-stat { display: flex; flex-direction: column; gap: 3px; }
.aui-stat__label {
  font-size: var(--text-xs);
  color: var(--muted-foreground);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  font-weight: 650;
  line-height: 1.3;
}
.aui-stat__value {
  font-size: 1.625rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.aui-stat__unit {
  font-size: var(--text-sm);
  color: var(--muted-foreground);
  font-weight: 500;
  margin-left: 3px;
  letter-spacing: 0;
}
.aui-stat__delta {
  font-size: var(--text-xs);
  font-weight: 650;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-variant-numeric: tabular-nums;
}
.aui-stat--up   .aui-stat__delta { color: var(--on-track); }
.aui-stat--down .aui-stat__delta { color: var(--blocked); }

/* ── chip ────────────────────────────────────────────────────────────────── */
.aui-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: var(--radius-sm);
  background: var(--muted);
  color: var(--muted-foreground);
  font-size: var(--text-xs);
  font-weight: 550;
  border: 1px solid transparent;
}

/* ── progress ────────────────────────────────────────────────────────────── */
.aui-progress {
  height: 5px;
  border-radius: 999px;
  background: var(--muted);
  overflow: hidden;
}
.aui-progress__bar {
  height: 100%;
  border-radius: 999px;
  background: var(--primary);
  transition: width 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.aui-progress--over .aui-progress__bar { background: var(--blocked); }

/* ── misc atoms ───────────────────────────────────────────────────────────── */
.aui-divider {
  height: 1px;
  background: var(--border);
  border: 0;
  margin: var(--space-3) 0;
}
.aui-kbd {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  background: var(--muted);
  border: 1px solid var(--border);
  border-bottom-width: 2px;
  border-radius: 4px;
  padding: 1px 5px;
  letter-spacing: 0.02em;
}
`;
