/**
 * TOKENS_CSS — two-tier design token architecture.
 *
 * TIER 1: PRIMITIVE palette — raw OKLCH ramps in :root.
 *   Naming: --{hue}-{step} where step is 50/100/200/300/400/500/600/700/800/900/950.
 *   Perceptually uniform: same step = same perceived lightness across hues (OKLCH property).
 *   Never use primitives directly in components — only semantic aliases should be consumed.
 *
 * TIER 2: SEMANTIC aliases — defined per [data-theme], reference primitives.
 *   Visual contract: existing names unchanged (see CONTRACT.md).
 *   Theme swap = edit aliases only, not leaf math.
 *
 * Themes shipped:
 *   dark         — near-Linear near-black bg, elevation via lightness steps
 *   light        — near-Vercel/shadcn warm near-white, shadow elevation
 *   high-contrast — near-black/near-white extremes, max border width, saturated status
 *
 * New tokens (all per CONTRACT.md additive rule):
 *   --focus-ring       distinct a11y focus outline (higher-contrast than --ring)
 *   --scrim / --overlay  dialog backdrop translucent values
 *   --z-{step}         z-index ladder: base/sticky/dropdown/overlay/toast
 *   --density          responsive spacing multiplier; [data-density="compact"] = 0.75
 *   --space-pad        density-driven surface padding (proof token)
 *
 * Chart bug fix:
 *   --chart-1..8 and --fl-1..3 now live INSIDE each theme block (was :root-only).
 *   Dark  → same blue→violet arc (L 0.58–0.68), keeps existing look.
 *   Light → lower-L ramp (L 0.42–0.56, +0.02 chroma) for legibility on near-white.
 *
 * References:
 *   - Linear.app: dark bg #050505, elevation via L not shadow
 *   - Vercel.com: OKLCH gradients, Geist type stack, warm near-white
 *   - WCAG 2.2: 4.5:1 normal text, 3:1 large/UI, 2.4.11 focus indicator
 */
export const TOKENS_CSS = `

/* ═══════════════════════════════════════════════════════════════════════════
   TIER 1 — PRIMITIVE PALETTE
   Raw OKLCH ramps. Never consume these in components; use semantic aliases.
   ═══════════════════════════════════════════════════════════════════════════ */
:root {

  /* ── typography + scale (theme-agnostic) ─────────────────────────────── */
  --font-sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Code", Menlo, Consolas, monospace;

  --radius:    0.5rem;
  --radius-sm: 0.375rem;
  --radius-lg: 0.75rem;

  --text-xs:   0.6875rem;
  --text-sm:   0.8125rem;
  --text-base: 0.9375rem;
  --text-lg:   1.0625rem;

  /* ── spacing ladder (4-base) ─────────────────────────────────────────── */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;

  /* ── z-index ladder ──────────────────────────────────────────────────── */
  --z-base:     1;
  --z-sticky:   10;
  --z-dropdown: 40;
  --z-overlay:  50;
  --z-toast:    60;

  /* ── density hook ────────────────────────────────────────────────────── */
  --density:    1;
  --space-pad:  calc(var(--space-3) * var(--density));   /* opt-in derived token */

  /* ── gray ramp ───────────────────────────────────────────────────────── */
  /* Hue 260 (blue-gray, same as design system base hue) */
  --gray-50:  oklch(0.98 0.002 260);
  --gray-100: oklch(0.96 0.003 260);
  --gray-200: oklch(0.92 0.005 260);
  --gray-300: oklch(0.82 0.008 260);
  --gray-400: oklch(0.70 0.012 260);
  --gray-500: oklch(0.58 0.016 260);
  --gray-600: oklch(0.46 0.020 260);
  --gray-700: oklch(0.36 0.018 260);
  --gray-800: oklch(0.27 0.012 260);
  --gray-900: oklch(0.20 0.008 260);
  --gray-950: oklch(0.14 0.006 260);

  /* ── blue ramp (hue 250) ─────────────────────────────────────────────── */
  --blue-50:  oklch(0.97 0.02  250);
  --blue-100: oklch(0.94 0.04  250);
  --blue-200: oklch(0.88 0.07  250);
  --blue-300: oklch(0.78 0.11  250);
  --blue-400: oklch(0.70 0.15  250);
  --blue-500: oklch(0.62 0.18  250);
  --blue-600: oklch(0.52 0.20  250);
  --blue-700: oklch(0.44 0.18  250);
  --blue-800: oklch(0.36 0.14  250);
  --blue-900: oklch(0.28 0.10  250);

  /* ── teal ramp (hue 175) ─────────────────────────────────────────────── */
  --teal-50:  oklch(0.97 0.02  175);
  --teal-100: oklch(0.93 0.05  175);
  --teal-200: oklch(0.86 0.09  175);
  --teal-300: oklch(0.76 0.13  175);
  --teal-400: oklch(0.68 0.16  175);
  --teal-500: oklch(0.60 0.17  175);
  --teal-600: oklch(0.50 0.16  175);
  --teal-700: oklch(0.42 0.14  175);
  --teal-800: oklch(0.34 0.11  175);
  --teal-900: oklch(0.26 0.08  175);

  /* ── cyan-green ramp (hue 148) ───────────────────────────────────────── */
  --cyan-50:  oklch(0.97 0.02  148);
  --cyan-100: oklch(0.93 0.05  148);
  --cyan-200: oklch(0.87 0.09  148);
  --cyan-300: oklch(0.78 0.13  148);
  --cyan-400: oklch(0.70 0.15  148);
  --cyan-500: oklch(0.62 0.15  148);
  --cyan-600: oklch(0.52 0.14  148);
  --cyan-700: oklch(0.44 0.12  148);
  --cyan-800: oklch(0.36 0.09  148);
  --cyan-900: oklch(0.28 0.07  148);

  /* ── green ramp (hue 150) ────────────────────────────────────────────── */
  --green-50:  oklch(0.97 0.03  150);
  --green-100: oklch(0.93 0.06  150);
  --green-200: oklch(0.87 0.10  150);
  --green-300: oklch(0.78 0.15  150);
  --green-400: oklch(0.70 0.18  150);
  --green-500: oklch(0.62 0.19  150);
  --green-600: oklch(0.50 0.18  150);
  --green-700: oklch(0.42 0.16  150);
  --green-800: oklch(0.34 0.12  150);
  --green-900: oklch(0.26 0.08  150);

  /* ── amber-green ramp (hue 95) ───────────────────────────────────────── */
  --amber-green-50:  oklch(0.97 0.03   95);
  --amber-green-100: oklch(0.93 0.07   95);
  --amber-green-200: oklch(0.87 0.12   95);
  --amber-green-300: oklch(0.78 0.15   95);
  --amber-green-400: oklch(0.70 0.15   95);
  --amber-green-500: oklch(0.62 0.14   95);
  --amber-green-600: oklch(0.52 0.13   95);
  --amber-green-700: oklch(0.44 0.11   95);
  --amber-green-800: oklch(0.36 0.09   95);
  --amber-green-900: oklch(0.28 0.06   95);

  /* ── amber ramp (hue 80) ─────────────────────────────────────────────── */
  --amber-50:  oklch(0.97 0.04   80);
  --amber-100: oklch(0.93 0.08   80);
  --amber-200: oklch(0.88 0.13   80);
  --amber-300: oklch(0.82 0.17   80);
  --amber-400: oklch(0.76 0.17   80);
  --amber-500: oklch(0.68 0.16   80);
  --amber-600: oklch(0.60 0.17   75);
  --amber-700: oklch(0.50 0.16   75);
  --amber-800: oklch(0.42 0.13   75);
  --amber-900: oklch(0.34 0.09   75);

  /* ── orange ramp (hue 45) ────────────────────────────────────────────── */
  --orange-50:  oklch(0.97 0.04   45);
  --orange-100: oklch(0.93 0.08   45);
  --orange-200: oklch(0.87 0.13   45);
  --orange-300: oklch(0.80 0.18   45);
  --orange-400: oklch(0.74 0.21   45);
  --orange-500: oklch(0.68 0.20   45);
  --orange-600: oklch(0.56 0.20   45);
  --orange-700: oklch(0.46 0.18   45);
  --orange-800: oklch(0.38 0.14   45);
  --orange-900: oklch(0.30 0.10   45);

  /* ── red ramp (hue 25) ───────────────────────────────────────────────── */
  --red-50:  oklch(0.97 0.03   25);
  --red-100: oklch(0.93 0.07   25);
  --red-200: oklch(0.87 0.12   25);
  --red-300: oklch(0.78 0.18   25);
  --red-400: oklch(0.70 0.22   25);
  --red-500: oklch(0.62 0.22   25);
  --red-600: oklch(0.52 0.24   25);
  --red-700: oklch(0.44 0.22   25);
  --red-800: oklch(0.36 0.18   25);
  --red-900: oklch(0.28 0.13   25);

  /* ── violet ramp (hue 305) ───────────────────────────────────────────── */
  --violet-50:  oklch(0.97 0.02  305);
  --violet-100: oklch(0.93 0.05  305);
  --violet-200: oklch(0.87 0.09  305);
  --violet-300: oklch(0.78 0.13  305);
  --violet-400: oklch(0.70 0.16  305);
  --violet-500: oklch(0.62 0.18  305);
  --violet-600: oklch(0.52 0.18  305);
  --violet-700: oklch(0.44 0.16  305);
  --violet-800: oklch(0.36 0.12  305);
  --violet-900: oklch(0.28 0.09  305);

  /* ── slate ramp (hue 270) ────────────────────────────────────────────── */
  --slate-50:  oklch(0.97 0.01  270);
  --slate-100: oklch(0.93 0.02  270);
  --slate-200: oklch(0.87 0.03  270);
  --slate-300: oklch(0.78 0.05  270);
  --slate-400: oklch(0.70 0.08  270);
  --slate-500: oklch(0.62 0.10  270);
  --slate-600: oklch(0.52 0.10  270);
  --slate-700: oklch(0.44 0.09  270);
  --slate-800: oklch(0.36 0.07  270);
  --slate-900: oklch(0.28 0.05  270);

  /* ── aqua ramp (hue 200) ─────────────────────────────────────────────── */
  --aqua-50:  oklch(0.97 0.02  200);
  --aqua-100: oklch(0.93 0.05  200);
  --aqua-200: oklch(0.87 0.09  200);
  --aqua-300: oklch(0.78 0.13  200);
  --aqua-400: oklch(0.70 0.14  200);
  --aqua-500: oklch(0.62 0.14  200);
  --aqua-600: oklch(0.52 0.13  200);
  --aqua-700: oklch(0.44 0.11  200);
  --aqua-800: oklch(0.36 0.09  200);
  --aqua-900: oklch(0.28 0.07  200);
}

/* ── density compact override ─────────────────────────────────────────────── */
[data-density="compact"] {
  --density: 0.75;
}

/* ═══════════════════════════════════════════════════════════════════════════
   TIER 2 — DARK THEME (default)
   Semantic aliases referencing primitives. Near-Linear: near-black bg,
   elevation via lightness steps (+0.05/+0.10), not shadow.
   ═══════════════════════════════════════════════════════════════════════════ */
[data-theme="dark"] {

  /* surfaces */
  --background:        var(--gray-950);         /* oklch(0.14 0.006 260) */
  --foreground:        oklch(0.95 0.004 260);   /* near-white + slight blue tint */
  --card:              oklch(0.18 0.007 260);   /* gray-950 +L0.04 */
  --card-foreground:   oklch(0.95 0.004 260);
  --muted:             oklch(0.22 0.008 260);   /* +L0.08 from bg */
  --muted-foreground:  oklch(0.62 0.018 260);
  --border:            oklch(0.27 0.010 260);   /* --gray-800 ish */
  --input:             oklch(0.27 0.010 260);
  --ring:              var(--blue-500);         /* oklch(0.62 0.18 250) */
  --focus-ring:        oklch(0.80 0.16 250);    /* higher-L = higher contrast on dark bg */

  /* brand */
  --primary:           var(--blue-500);         /* oklch(0.62 0.18 250) */
  --primary-foreground:oklch(0.97 0.005 260);
  --accent:            oklch(0.23 0.012 260);   /* card +L0.05 */
  --accent-foreground: oklch(0.95 0.004 260);

  /* shadows — dark elevates via bg lightness, shadow is secondary */
  --shadow:    0 1px 3px oklch(0 0 0 / 0.40), 0 1px 2px oklch(0 0 0 / 0.24);
  --shadow-lg: 0 8px 24px oklch(0 0 0 / 0.55), 0 2px 8px oklch(0 0 0 / 0.30);

  /* scrim / overlay — dialog backdrop */
  --scrim:   oklch(0 0 0 / 0.60);
  --overlay: oklch(0 0 0 / 0.55);

  /* status */
  --success:              var(--green-400);     /* oklch(0.70 0.18 150) */
  --success-foreground:   oklch(0.97 0.01 150);
  --warning:              var(--amber-400);     /* oklch(0.76 0.17 80) */
  --warning-foreground:   oklch(0.18 0.04  80);
  --destructive:          var(--red-500);       /* oklch(0.62 0.22 25) */
  --destructive-foreground: oklch(0.97 0.01 25);

  /* kanban */
  --on-track: var(--green-400);                 /* oklch(0.70 0.18 150) */
  --at-risk:  var(--amber-400);                 /* oklch(0.76 0.17 80) */
  --aging:    var(--orange-500);                /* oklch(0.68 0.20 45) */
  --done:     oklch(0.58 0.04 260);             /* muted slate — no primitive needed */
  --blocked:  var(--red-500);                   /* oklch(0.62 0.22 25) */

  /* class of service */
  --cos-expedite:   var(--red-500);             /* oklch(0.62 0.22 25) */
  --cos-fixed-date: var(--amber-400);           /* oklch(0.76 0.17 80) */
  --cos-standard:   var(--blue-500);            /* oklch(0.62 0.18 250) */
  --cos-intangible: oklch(0.58 0.04 260);

  /* ── chart ramp — dark, same-L arc (0.58–0.68) ──────────────────────────
   * s0 Done    → blue      — bottom CFD band (largest)
   * s1 In Test → teal
   * s2 In Dev  → cyan-green
   * s3 Analysis→ amber-green
   * s4 Backlog → violet    — top band (shows growth pressure)
   * s5–s7      → extra series: scatter / histogram / forecast
   * Uniform L across hues = equal perceptual weight in stacked CFD.
   * ────────────────────────────────────────────────────────────────────── */
  --chart-1: var(--blue-500);                   /* oklch(0.62 0.18 250) */
  --chart-2: oklch(0.64 0.16 175);              /* teal-400 ish */
  --chart-3: oklch(0.66 0.15 148);              /* cyan-400 ish */
  --chart-4: oklch(0.68 0.14  95);              /* amber-green-400 ish */
  --chart-5: var(--violet-500);                 /* oklch(0.62 0.18 305) */
  --chart-6: oklch(0.64 0.13  35);              /* warm amber extra */
  --chart-7: var(--slate-500);                  /* oklch(0.62 0.10 270) */
  --chart-8: var(--aqua-500);                   /* oklch(0.62 0.14 200) */

  /* flight levels — dark */
  --fl-1: oklch(0.64 0.16 175);                 /* teal   — operational FL1 */
  --fl-2: var(--blue-500);                      /* blue   — coordination FL2 */
  --fl-3: var(--violet-500);                    /* violet — strategic FL3 */
}

/* ═══════════════════════════════════════════════════════════════════════════
   TIER 2 — LIGHT THEME
   Semantic aliases referencing primitives. Near-Vercel/shadcn:
   warm near-white bg, card = pure white + box-shadow elevation.
   Primary shifted to blue-600 for AA on white (≥4.5:1).
   ═══════════════════════════════════════════════════════════════════════════ */
[data-theme="light"] {

  /* surfaces */
  --background:        var(--gray-50);          /* oklch(0.98 0.002 260) */
  --foreground:        oklch(0.18 0.012 260);
  --card:              oklch(1.00 0.000   0);   /* pure white */
  --card-foreground:   oklch(0.18 0.012 260);
  --muted:             var(--gray-100);         /* oklch(0.96 0.003 260) */
  --muted-foreground:  oklch(0.46 0.022 260);
  --border:            var(--gray-200);         /* oklch(0.92 0.005 260) ish */
  --input:             var(--gray-200);
  --ring:              var(--blue-600);         /* oklch(0.52 0.20 250) */
  --focus-ring:        oklch(0.40 0.22 250);    /* deeper blue = higher contrast on white */

  /* brand */
  --primary:           var(--blue-600);         /* oklch(0.52 0.20 250) */
  --primary-foreground:oklch(0.99 0.004 260);
  --accent:            var(--gray-100);         /* oklch(0.96 0.003 260) ish */
  --accent-foreground: oklch(0.22 0.015 260);

  /* shadows — light uses actual shadow for elevation */
  --shadow:    0 1px 3px oklch(0.18 0.01 260 / 0.10), 0 1px 2px oklch(0.18 0.01 260 / 0.06);
  --shadow-lg: 0 8px 24px oklch(0.18 0.01 260 / 0.14), 0 2px 8px oklch(0.18 0.01 260 / 0.08);

  /* scrim / overlay — dialog backdrop, still dark but less opaque on light bg */
  --scrim:   oklch(0.10 0.01 260 / 0.50);
  --overlay: oklch(0.10 0.01 260 / 0.45);

  /* status */
  --success:              var(--green-600);     /* oklch(0.50 0.18 150) — AA on white */
  --success-foreground:   oklch(0.99 0.01 150);
  --warning:              var(--amber-600);     /* oklch(0.60 0.17 75) */
  --warning-foreground:   oklch(0.99 0.01  75);
  --destructive:          var(--red-600);       /* oklch(0.52 0.24 25) */
  --destructive-foreground: oklch(0.99 0.01 25);

  /* kanban */
  --on-track: var(--green-600);                 /* oklch(0.50 0.18 150) */
  --at-risk:  var(--amber-600);                 /* oklch(0.60 0.17 75) */
  --aging:    var(--orange-600);                /* oklch(0.56 0.20 45) */
  --done:     oklch(0.48 0.04 260);
  --blocked:  var(--red-600);                   /* oklch(0.52 0.24 25) */

  /* class of service */
  --cos-expedite:   var(--red-600);
  --cos-fixed-date: var(--amber-600);
  --cos-standard:   var(--blue-600);
  --cos-intangible: oklch(0.48 0.04 260);

  /* ── chart ramp — light theme, lower-L for legibility on near-white ─────
   * L range: 0.42–0.56 (vs 0.58–0.68 in dark).
   * +0.02 chroma vs dark counterparts = more saturation compensates for
   *   lighter bg washing out mid-L hues.
   * Hue arc preserved (blue→teal→cyan-green→amber-green→violet) so CFD
   *   band identity is consistent with dark theme at a glance.
   * ────────────────────────────────────────────────────────────────────── */
  --chart-1: oklch(0.46 0.20 250);   /* blue       — Done / primary series */
  --chart-2: oklch(0.48 0.18 175);   /* teal       — In Test */
  --chart-3: oklch(0.50 0.17 148);   /* cyan-green — In Dev */
  --chart-4: oklch(0.52 0.16  95);   /* amber-green— In Analysis */
  --chart-5: oklch(0.44 0.20 305);   /* violet     — Backlog */
  --chart-6: oklch(0.50 0.15  35);   /* amber      — extra */
  --chart-7: oklch(0.44 0.12 270);   /* slate      — extra */
  --chart-8: oklch(0.48 0.15 200);   /* aqua       — extra */

  /* flight levels — light */
  --fl-1: oklch(0.48 0.18 175);      /* teal   — operational FL1 */
  --fl-2: oklch(0.46 0.20 250);      /* blue   — coordination FL2 */
  --fl-3: oklch(0.44 0.20 305);      /* violet — strategic FL3 */
}

/* ═══════════════════════════════════════════════════════════════════════════
   TIER 2 — HIGH-CONTRAST THEME
   Proof that two-tier pays off: only alias overrides, no new leaf math.
   Near-black/near-white extremes + max border + saturated unambiguous status.
   Rationale: AAA contrast (7:1+) for users with low vision, harsh environments,
   or OLED glare. Inspired by WCAG 2.2 §1.4.6 Enhanced Contrast.
   ═══════════════════════════════════════════════════════════════════════════ */
[data-theme="high-contrast"] {

  /* surfaces — near-black bg, pure white fg */
  --background:        oklch(0.06 0.003 260);   /* near-black */
  --foreground:        oklch(0.99 0.000   0);   /* pure white */
  --card:              oklch(0.10 0.004 260);   /* slightly lighter than bg */
  --card-foreground:   oklch(0.99 0.000   0);
  --muted:             oklch(0.14 0.005 260);
  --muted-foreground:  oklch(0.82 0.005 260);   /* high-contrast muted: still legible */
  --border:            oklch(0.50 0.008 260);   /* thick visual border */
  --input:             oklch(0.50 0.008 260);
  --ring:              oklch(1.00 0.000   0);   /* white ring on near-black */
  --focus-ring:        oklch(0.96 0.06  100);   /* vivid yellow-green for max visibility */

  /* brand */
  --primary:           oklch(0.72 0.20 250);    /* brighter blue for max contrast on near-black */
  --primary-foreground:oklch(0.04 0.002 260);   /* near-black text on bright primary */
  --accent:            oklch(0.18 0.006 260);
  --accent-foreground: oklch(0.99 0.000   0);

  /* shadows — near-invisible on near-black; border carries the elevation signal */
  --shadow:    0 0 0 1px oklch(0.50 0.008 260);
  --shadow-lg: 0 0 0 2px oklch(0.50 0.008 260);

  /* scrim / overlay */
  --scrim:   oklch(0 0 0 / 0.80);
  --overlay: oklch(0 0 0 / 0.75);

  /* status — fully saturated, maximum chroma for each hue */
  --success:              oklch(0.80 0.22 150);  /* bright green */
  --success-foreground:   oklch(0.06 0.01 150);
  --warning:              oklch(0.88 0.20  80);  /* vivid amber */
  --warning-foreground:   oklch(0.06 0.02  80);
  --destructive:          oklch(0.72 0.28  25);  /* vivid red */
  --destructive-foreground: oklch(0.06 0.01 25);

  /* kanban — each hue distinct + vivid */
  --on-track: oklch(0.80 0.22 150);             /* bright green */
  --at-risk:  oklch(0.88 0.20  80);             /* vivid amber */
  --aging:    oklch(0.82 0.24  45);             /* vivid orange */
  --done:     oklch(0.72 0.06 260);             /* bright slate */
  --blocked:  oklch(0.72 0.28  25);             /* vivid red */

  /* class of service — same saturated approach */
  --cos-expedite:   oklch(0.72 0.28  25);
  --cos-fixed-date: oklch(0.88 0.20  80);
  --cos-standard:   oklch(0.72 0.20 250);
  --cos-intangible: oklch(0.72 0.06 260);

  /* chart ramp — max-contrast arc on near-black, vivid chroma */
  --chart-1: oklch(0.72 0.22 250);   /* vivid blue */
  --chart-2: oklch(0.74 0.20 175);   /* vivid teal */
  --chart-3: oklch(0.76 0.19 148);   /* vivid cyan-green */
  --chart-4: oklch(0.78 0.18  95);   /* vivid amber-green */
  --chart-5: oklch(0.70 0.22 305);   /* vivid violet */
  --chart-6: oklch(0.76 0.18  35);   /* vivid amber */
  --chart-7: oklch(0.68 0.14 270);   /* bright slate */
  --chart-8: oklch(0.74 0.18 200);   /* vivid aqua */

  /* flight levels — high-contrast */
  --fl-1: oklch(0.74 0.20 175);      /* vivid teal */
  --fl-2: oklch(0.72 0.22 250);      /* vivid blue */
  --fl-3: oklch(0.70 0.22 305);      /* vivid violet */
}

/* ═══════════════════════════════════════════════════════════════════════════
   BASE RESET
   ═══════════════════════════════════════════════════════════════════════════ */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ── density proof surface: statcard uses --space-pad ───────────────────── */
.aui-statcard {
  padding: var(--space-pad, var(--space-3)) calc(var(--space-pad, var(--space-3)) + 4px);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;
