/**
 * FORMS_CSS — CRUD / forms / data components.
 *
 * Design decisions:
 *   Inputs: 40px min-height (44px on mobile) with 2px focus ring via --ring.
 *     Invalid state uses --destructive ring + border, not color-only (colorblind-safe).
 *     Disabled: opacity 0.45, cursor not-allowed, pointer-events none.
 *   Switch: pure CSS via <input type="checkbox" class="aui-switch"> — :checked pseudo
 *     drives the knob position. No JS required, keyboard operable.
 *   Checkbox/radio: accent-color for simplicity; fallback custom `:checked` bg for
 *     browsers without accent-color support.
 *   Table: tabular-nums, sticky header with backdrop-blur, right-aligned numbers.
 *     Sort carets via inline SVG data-uri (no external assets, no JS required for static
 *     visual; host toggles .is-sorted-asc / .is-sorted-desc classes).
 *   Dialog: native <dialog> scaffold. Host calls showModal()/close(). CSS provides
 *     backdrop, panel sizing, animation (respects prefers-reduced-motion).
 *     [data-open] attribute alternative for non-native dialog polyfill hosts.
 *   Toast: position fixed bottom-right, z-index 60 (ladder), stacked via flex-col-reverse.
 *   Spinner: CSS @keyframes on a border segment — no SVG, no JS.
 *   Inline edit: display↔input swap via CSS hooks .is-editing on parent.
 *   Tag input: chip list + live input in one row, flex-wrap.
 *   Loading state (.is-loading): spinner pseudo-element on button, text hidden via
 *     color:transparent (preserves width).
 *
 * References:
 *   - shadcn/ui input, form, table, dialog patterns (2025-2026)
 *   - Linear.app status / table conventions
 *   - WCAG 2.2 4.5:1 contrast, 2.4.11 focus indicator area
 */
export const FORMS_CSS = `
/* ═══════════════════════════════════════════════════════════════════════════
   INPUTS / FORM CONTROLS
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── base input (text / email / number / password / search / url / tel) ─── */
.aui-input {
  display: block;
  width: 100%;
  min-height: 40px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--input);
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  line-height: 1.5;
  transition: border-color 0.15s ease-out, box-shadow 0.15s ease-out;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}
.aui-input::placeholder { color: var(--muted-foreground); }
.aui-input:focus-visible {
  border-color: var(--ring);
  box-shadow: 0 0 0 2px color-mix(in oklch, var(--ring) 30%, transparent);
}
.aui-input:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}
.aui-input.is-invalid {
  border-color: var(--destructive);
  box-shadow: 0 0 0 2px color-mix(in oklch, var(--destructive) 25%, transparent);
}
.aui-input[type="number"] { font-variant-numeric: tabular-nums; }

/* ── textarea ─────────────────────────────────────────────────────────────── */
.aui-textarea {
  display: block;
  width: 100%;
  min-height: 96px;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--input);
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  line-height: 1.6;
  resize: vertical;
  transition: border-color 0.15s ease-out, box-shadow 0.15s ease-out;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}
.aui-textarea::placeholder { color: var(--muted-foreground); }
.aui-textarea:focus-visible {
  border-color: var(--ring);
  box-shadow: 0 0 0 2px color-mix(in oklch, var(--ring) 30%, transparent);
}
.aui-textarea:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}
.aui-textarea.is-invalid {
  border-color: var(--destructive);
  box-shadow: 0 0 0 2px color-mix(in oklch, var(--destructive) 25%, transparent);
}

/* ── select — styled native with chevron (no JS) ──────────────────────────
 * Chevron is base64-encoded inline SVG, theme-aware via CSS mask.
 * Padding-right reserves space so text never overlaps the arrow.
 * appearance:none removes native arrow on all browsers. */
.aui-select {
  display: block;
  width: 100%;
  min-height: 40px;
  padding: 0 var(--space-6) 0 var(--space-3);
  border-radius: var(--radius-sm);
  border: 1px solid var(--input);
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  line-height: 1.5;
  cursor: pointer;
  transition: border-color 0.15s ease-out, box-shadow 0.15s ease-out;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  /* Chevron via CSS mask on a pseudo — but <select> has no pseudo.
     Use background-image with SVG data-uri. currentColor workaround: embed
     explicit stroke color matching muted-foreground hsl(240 5% 64.9%) */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='none' stroke='%23a0a0b0' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M2.5 4.5L6 8l3.5-3.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right var(--space-3) center;
  background-size: 12px 12px;
}
.aui-select:focus-visible {
  border-color: var(--ring);
  box-shadow: 0 0 0 2px color-mix(in oklch, var(--ring) 30%, transparent);
}
.aui-select:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}
.aui-select.is-invalid {
  border-color: var(--destructive);
  box-shadow: 0 0 0 2px color-mix(in oklch, var(--destructive) 25%, transparent);
}

/* ── input group (prefix/suffix addons) ──────────────────────────────────── */
.aui-input-group {
  display: flex;
  align-items: stretch;
}
.aui-input-group .aui-input {
  flex: 1 1 0;
  border-radius: 0;
  min-width: 0;
}
.aui-input-group .aui-input:first-child { border-radius: var(--radius-sm) 0 0 var(--radius-sm); }
.aui-input-group .aui-input:last-child  { border-radius: 0 var(--radius-sm) var(--radius-sm) 0; }
.aui-input-group .aui-input:only-child  { border-radius: var(--radius-sm); }
.aui-input-group__addon {
  display: inline-flex;
  align-items: center;
  padding: 0 var(--space-3);
  background: var(--muted);
  border: 1px solid var(--input);
  color: var(--muted-foreground);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  line-height: 1;
}
.aui-input-group__addon:first-child {
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  border-right: none;
}
.aui-input-group__addon:last-child {
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  border-left: none;
}
/* Adjacent input loses its shared border */
.aui-input-group__addon:first-child + .aui-input { border-left: none; }
.aui-input-group .aui-input + .aui-input-group__addon { border-left: none; }

/* ── checkbox ─────────────────────────────────────────────────────────────── */
.aui-checkbox {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  min-width: 16px;
  border-radius: 4px;
  border: 1.5px solid var(--input);
  background: var(--background);
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, box-shadow 0.12s;
  display: inline-block;
  vertical-align: middle;
  position: relative;
  flex-shrink: 0;
}
.aui-checkbox:checked {
  background: var(--primary);
  border-color: var(--primary);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='none' stroke='%23ffffff' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round' d='M1.5 5l2.5 2.5L8.5 2.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
  background-size: 10px 10px;
}
.aui-checkbox:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
.aui-checkbox:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}
.aui-checkbox:indeterminate {
  background: var(--primary);
  border-color: var(--primary);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='none' stroke='%23ffffff' stroke-width='2' stroke-linecap='round' d='M2 5h6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
  background-size: 10px 10px;
}

/* ── radio ────────────────────────────────────────────────────────────────── */
.aui-radio {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  min-width: 16px;
  border-radius: 50%;
  border: 1.5px solid var(--input);
  background: var(--background);
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, box-shadow 0.12s;
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
.aui-radio:checked {
  background: var(--primary);
  border-color: var(--primary);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Ccircle cx='5' cy='5' r='2.5' fill='%23ffffff'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: center;
  background-size: 10px 10px;
}
.aui-radio:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
.aui-radio:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

/* ── switch (toggle) — pure CSS, no JS ──────────────────────────────────────
 * <input type="checkbox" class="aui-switch">
 * Track: 36×20px pill. Knob: 14px circle, CSS left transition on :checked.
 * Full keyboard operable (Space toggles, Tab focuses). */
.aui-switch {
  -webkit-appearance: none;
  appearance: none;
  position: relative;
  width: 36px;
  height: 20px;
  min-width: 36px;
  border-radius: 999px;
  border: 1.5px solid var(--input);
  background: var(--muted);
  cursor: pointer;
  transition: background 0.18s ease-out, border-color 0.18s ease-out, box-shadow 0.18s ease-out;
  flex-shrink: 0;
}
.aui-switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--muted-foreground);
  transition: left 0.18s cubic-bezier(0.16, 1, 0.3, 1),
              background 0.18s ease-out;
}
.aui-switch:checked {
  background: var(--primary);
  border-color: var(--primary);
}
.aui-switch:checked::after {
  left: calc(100% - 14px);
  background: var(--primary-foreground);
}
.aui-switch:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
.aui-switch:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .aui-switch, .aui-switch::after { transition-duration: 0.01ms !important; }
}

/* ═══════════════════════════════════════════════════════════════════════════
   FIELD WRAPPERS (EXTENDS molecules.ts .aui-field / .aui-field__label)
   — do not redefine base .aui-field or .aui-field__label; only ADD slots.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Help text — secondary context, below input */
.aui-field__help {
  font-size: var(--text-xs);
  color: var(--muted-foreground);
  line-height: 1.5;
  margin-top: 2px;
}

/* Error message — destructive color, inline below input */
.aui-field__error {
  font-size: var(--text-xs);
  color: var(--destructive);
  line-height: 1.5;
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
}
/* Error icon: inline SVG via ::before */
.aui-field__error::before {
  content: "";
  display: inline-block;
  width: 12px;
  height: 12px;
  min-width: 12px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Ccircle cx='6' cy='6' r='5' fill='none' stroke='%23e5534b' stroke-width='1.25'/%3E%3Cpath fill='%23e5534b' d='M5.45 3.5h1.1l-.15 3.2H5.6zm0 4h1.1v1.1H5.45z'/%3E%3C/svg%3E") no-repeat center / 12px;
}

/* Hint text — optional/additional guidance, lighter than help */
.aui-field__hint {
  font-size: var(--text-xs);
  color: var(--muted-foreground);
  line-height: 1.5;
  font-style: italic;
  opacity: 0.85;
}

/* Required asterisk — appended via .aui-field--required on the .aui-field wrapper */
.aui-field--required .aui-field__label::after {
  content: " *";
  color: var(--destructive);
  font-weight: 700;
  margin-left: 1px;
}

/* Inline checkbox / radio row (label + control horizontal) */
.aui-field--inline {
  flex-direction: row;
  align-items: center;
  gap: var(--space-2);
}
.aui-field--inline .aui-field__label {
  font-size: var(--text-sm);
  color: var(--foreground);
  font-weight: 500;
  letter-spacing: 0;
  margin-bottom: 0;
  cursor: pointer;
}

/* ═══════════════════════════════════════════════════════════════════════════
   FORM LAYOUT
   ═══════════════════════════════════════════════════════════════════════════ */

/* Form root — vertical stack with consistent gap */
.aui-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* Responsive 2-col grid — collapses to 1-col on narrow containers.
 * Container query aware (container-type: inline-size on parent).
 * Fallback: fluid grid with auto-fit. */
.aui-form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  gap: var(--space-4);
  align-items: start;
}
/* Full-width span helper inside grid */
.aui-form-grid > .aui-field--full { grid-column: 1 / -1; }

/* Fieldset — groups related controls with optional legend */
.aui-fieldset {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.aui-fieldset__legend {
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--muted-foreground);
  padding: 0 var(--space-2);
  /* Legend uses float trick for proper HTML legend positioning */
  float: left;
  width: 100%;
  margin-bottom: var(--space-3);
}
/* Reset float spacing */
.aui-fieldset::after {
  content: "";
  display: block;
  clear: both;
}

/* Form actions row — right-aligned by default, wraps on mobile */
.aui-form-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  flex-wrap: wrap;
  padding-top: var(--space-2);
}
/* Left-align variant */
.aui-form-actions--left { justify-content: flex-start; }
/* Spread variant */
.aui-form-actions--spread { justify-content: space-between; }

/* ═══════════════════════════════════════════════════════════════════════════
   BUTTON EXTENSIONS (extends atoms.ts .aui-btn)
   ═══════════════════════════════════════════════════════════════════════════ */

/* Destructive — red bg, white text */
.aui-btn--destructive {
  background: var(--destructive);
  color: var(--destructive-foreground);
  border-color: transparent;
}
.aui-btn--destructive:hover {
  background: color-mix(in oklch, var(--destructive) 88%, var(--foreground));
  transform: translateY(-1px);
  box-shadow: var(--shadow);
}

/* Outline — transparent bg, colored border */
.aui-btn--outline {
  background: transparent;
  border-color: var(--border);
  color: var(--foreground);
}
.aui-btn--outline:hover {
  background: var(--accent);
  border-color: color-mix(in oklch, var(--ring) 50%, var(--border));
  transform: translateY(-1px);
}

/* Block — full width */
.aui-btn--block {
  display: flex;
  width: 100%;
  justify-content: center;
}

/* Icon-only button — square, no text */
.aui-btn--icon {
  padding: 0;
  width: 36px;
  height: 36px;
  min-width: 36px;
  justify-content: center;
  border-radius: var(--radius-sm);
}
.aui-btn--icon.aui-btn--sm {
  width: 28px;
  height: 28px;
  min-width: 28px;
}

/* Button group — connected siblings, shared borders */
.aui-btn-group {
  display: inline-flex;
  align-items: stretch;
}
.aui-btn-group .aui-btn {
  border-radius: 0;
  margin-left: -1px;
  position: relative;
}
.aui-btn-group .aui-btn:first-child {
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  margin-left: 0;
}
.aui-btn-group .aui-btn:last-child {
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}
.aui-btn-group .aui-btn:focus-visible {
  z-index: 1;
}
.aui-btn-group .aui-btn.is-active {
  background: var(--accent);
  color: var(--accent-foreground);
  z-index: 1;
}

/* Loading state — spinner via border animation, text hidden via color:transparent.
 * Width is preserved (no layout shift). Spinner: spinning pseudo-element. */
.aui-btn.is-loading {
  cursor: wait;
  pointer-events: none;
  color: transparent;
  position: relative;
}
.aui-btn.is-loading::after {
  content: "";
  position: absolute;
  inset: 0;
  margin: auto;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-right-color: currentColor;
  animation: aui-spin 0.6s linear infinite;
}
/* For primary button, spinner uses primary-foreground */
.aui-btn--primary.is-loading::after { border-top-color: var(--primary-foreground); border-right-color: var(--primary-foreground); }
/* For destructive */
.aui-btn--destructive.is-loading::after { border-top-color: var(--destructive-foreground); border-right-color: var(--destructive-foreground); }

@keyframes aui-spin {
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .aui-btn.is-loading::after { animation: none; opacity: 0.6; }
}

/* ═══════════════════════════════════════════════════════════════════════════
   DATA TABLE
   ═══════════════════════════════════════════════════════════════════════════ */

/* Table container — horizontal scroll on overflow */
.aui-table-wrap {
  width: 100%;
  overflow-x: auto;
  border-radius: var(--radius);
  border: 1px solid var(--border);
}

.aui-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
}

/* Header */
.aui-table thead tr {
  border-bottom: 1px solid var(--border);
}
.aui-table th {
  padding: var(--space-2) var(--space-3);
  text-align: left;
  font-size: var(--text-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted-foreground);
  background: var(--muted);
  white-space: nowrap;
  /* Sticky header with frosted glass — Linear table pattern */
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* Body */
.aui-table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--border);
  color: var(--foreground);
  vertical-align: middle;
  line-height: 1.45;
}
.aui-table tbody tr:last-child td { border-bottom: none; }

/* Row hover */
.aui-table tbody tr {
  transition: background 0.10s ease-out;
}
.aui-table tbody tr:hover td {
  background: var(--accent);
}

/* Zebra striping */
.aui-table--zebra tbody tr:nth-child(even) td {
  background: color-mix(in oklch, var(--muted) 40%, transparent);
}
.aui-table--zebra tbody tr:nth-child(even):hover td {
  background: var(--accent);
}

/* Numeric cells — right-aligned tabular */
.aui-table td.aui-td--num,
.aui-table th.aui-th--num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

/* Sortable header — caret via ::after, no JS needed for caret visual */
.aui-th--sortable {
  cursor: pointer;
  user-select: none;
  position: relative;
  padding-right: calc(var(--space-3) + 14px);
  transition: color 0.12s;
}
.aui-th--sortable:hover { color: var(--foreground); }
.aui-th--sortable:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: -2px;
}
/* Default unsorted caret */
.aui-th--sortable::after {
  content: "";
  position: absolute;
  right: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  width: 10px;
  height: 10px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%23a0a0b0' d='M5 1.5l2.5 3H2.5zm0 7L2.5 5.5h5z'/%3E%3C/svg%3E") no-repeat center / 10px;
  opacity: 0.5;
}
/* Sorted ascending — up caret, full opacity */
.aui-th--sortable.is-sorted-asc::after {
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%236b9ef8' d='M5 1.5l2.5 3.5H2.5z'/%3E%3C/svg%3E") no-repeat center / 10px;
  opacity: 1;
}
/* Sorted descending — down caret */
.aui-th--sortable.is-sorted-desc::after {
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%236b9ef8' d='M2.5 4.5l2.5 3.5 2.5-3.5z'/%3E%3C/svg%3E") no-repeat center / 10px;
  opacity: 1;
}

/* Empty state row */
.aui-table__empty td {
  text-align: center;
  padding: var(--space-6);
  color: var(--muted-foreground);
  font-size: var(--text-sm);
}

/* Cell actions — right-aligned slot for action buttons, hidden until row hover */
.aui-table__cell-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  opacity: 0;
  transition: opacity 0.12s ease-out;
}
.aui-table tbody tr:hover .aui-table__cell-actions { opacity: 1; }

/* ── pagination ──────────────────────────────────────────────────────────── */
.aui-pagination {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  flex-wrap: wrap;
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
}
.aui-pagination__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--foreground);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s ease-out, border-color 0.12s ease-out;
  line-height: 1;
}
.aui-pagination__btn:hover:not(:disabled):not(.is-current) {
  background: var(--accent);
  border-color: color-mix(in oklch, var(--ring) 40%, var(--border));
}
.aui-pagination__btn:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
.aui-pagination__btn.is-current {
  background: var(--primary);
  color: var(--primary-foreground);
  border-color: var(--primary);
  font-weight: 700;
  cursor: default;
}
.aui-pagination__btn:disabled {
  opacity: 0.40;
  cursor: not-allowed;
  pointer-events: none;
}
.aui-pagination__ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  color: var(--muted-foreground);
  font-size: var(--text-sm);
  letter-spacing: 0.05em;
}

/* ═══════════════════════════════════════════════════════════════════════════
   OVERLAY / FEEDBACK
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── dialog (modal) — native <dialog> scaffold ───────────────────────────
 * Uses native <dialog> open attribute / showModal().
 * [data-open] class provided as fallback for polyfill hosts that toggle attr.
 * Backdrop + panel sizing + entry animation. */
.aui-dialog {
  position: fixed;
  inset: 0;
  z-index: var(--z-dropdown);
  display: none;
  align-items: center;
  justify-content: center;
  padding: var(--space-5);
}
/* Host sets [data-open] on .aui-dialog or uses native <dialog open> */
.aui-dialog[data-open],
dialog.aui-dialog[open] {
  display: flex;
}
.aui-dialog__backdrop {
  position: fixed;
  inset: 0;
  background: var(--scrim);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  z-index: var(--z-dropdown);
  animation: aui-fade-in 0.18s ease-out;
}
@keyframes aui-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes aui-slide-up {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0)   scale(1); }
}
.aui-dialog__panel {
  position: relative;
  z-index: var(--z-overlay);
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 480px;
  max-height: calc(100vh - var(--space-6) * 2);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  animation: aui-slide-up 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.aui-dialog__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.aui-dialog__title {
  font-size: var(--text-lg);
  font-weight: 650;
  letter-spacing: -0.02em;
  line-height: 1.25;
}
.aui-dialog__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  transition: background 0.12s, color 0.12s;
  flex-shrink: 0;
}
.aui-dialog__close:hover {
  background: var(--accent);
  color: var(--foreground);
}
.aui-dialog__close:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 1px;
}
.aui-dialog__body {
  padding: var(--space-5);
  flex: 1 1 auto;
  overflow-y: auto;
}
.aui-dialog__foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
  flex-wrap: wrap;
}
@media (prefers-reduced-motion: reduce) {
  .aui-dialog__backdrop { animation: none; }
  .aui-dialog__panel    { animation: none; }
}

/* ── toast ────────────────────────────────────────────────────────────────
 * z-index 60 (toast layer in ladder).
 * Variants: success / warning / destructive / info.
 * Stack: flex-column-reverse so newest appears at bottom.
 * Host manages adding/removing .aui-toast elements. */
.aui-toast-stack {
  position: fixed;
  bottom: var(--space-5);
  right: var(--space-5);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column-reverse;
  gap: var(--space-2);
  max-width: 360px;
  width: calc(100vw - var(--space-5) * 2);
  pointer-events: none;
}
.aui-toast {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--card-foreground);
  box-shadow: var(--shadow-lg);
  pointer-events: all;
  animation: aui-toast-in 0.24s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes aui-toast-in {
  from { opacity: 0; transform: translateX(16px); }
  to   { opacity: 1; transform: translateX(0); }
}
@media (prefers-reduced-motion: reduce) {
  .aui-toast { animation: none; }
}
.aui-toast__icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  margin-top: 1px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}
.aui-toast__body { flex: 1 1 auto; min-width: 0; }
.aui-toast__title {
  font-size: var(--text-sm);
  font-weight: 650;
  line-height: 1.3;
  margin-bottom: 2px;
}
.aui-toast__desc {
  font-size: var(--text-xs);
  color: var(--muted-foreground);
  line-height: 1.5;
}

/* Toast variants — border-left accent + icon tint */
.aui-toast--success {
  border-left: 3px solid var(--success);
}
.aui-toast--success .aui-toast__icon {
  background: color-mix(in oklch, var(--success) 16%, transparent);
  color: var(--success);
}
.aui-toast--warning {
  border-left: 3px solid var(--warning);
}
.aui-toast--warning .aui-toast__icon {
  background: color-mix(in oklch, var(--warning) 16%, transparent);
  color: var(--warning);
}
.aui-toast--destructive {
  border-left: 3px solid var(--destructive);
}
.aui-toast--destructive .aui-toast__icon {
  background: color-mix(in oklch, var(--destructive) 16%, transparent);
  color: var(--destructive);
}
.aui-toast--info {
  border-left: 3px solid var(--primary);
}
.aui-toast--info .aui-toast__icon {
  background: color-mix(in oklch, var(--primary) 16%, transparent);
  color: var(--primary);
}

/* ── alert (inline) ──────────────────────────────────────────────────────
 * Same variant taxonomy as toast but inline (no position:fixed).
 * Left accent stripe + tinted background. */
.aui-alert {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--card);
  color: var(--card-foreground);
  border-left-width: 3px;
}
.aui-alert__icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  margin-top: 1px;
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.aui-alert__body { flex: 1 1 auto; min-width: 0; }
.aui-alert__title {
  font-size: var(--text-sm);
  font-weight: 650;
  line-height: 1.3;
  margin-bottom: 2px;
}
.aui-alert__desc {
  font-size: var(--text-xs);
  color: var(--muted-foreground);
  line-height: 1.55;
}

.aui-alert--success {
  border-left-color: var(--success);
  background: color-mix(in oklch, var(--success) 8%, var(--card));
}
.aui-alert--success .aui-alert__icon { color: var(--success); }
.aui-alert--warning {
  border-left-color: var(--warning);
  background: color-mix(in oklch, var(--warning) 8%, var(--card));
}
.aui-alert--warning .aui-alert__icon { color: var(--warning); }
.aui-alert--destructive {
  border-left-color: var(--destructive);
  background: color-mix(in oklch, var(--destructive) 8%, var(--card));
}
.aui-alert--destructive .aui-alert__icon { color: var(--destructive); }
.aui-alert--info {
  border-left-color: var(--primary);
  background: color-mix(in oklch, var(--primary) 8%, var(--card));
}
.aui-alert--info .aui-alert__icon { color: var(--primary); }

/* ═══════════════════════════════════════════════════════════════════════════
   MISC CRUD PATTERNS
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── inline edit ─────────────────────────────────────────────────────────
 * Display value shows by default. Host adds .is-editing to swap to input.
 * CSS provides the swap hook — JS decides when to toggle. */
.aui-inline-edit { display: inline-block; position: relative; }
.aui-inline-edit__display {
  cursor: pointer;
  border-radius: var(--radius-sm);
  padding: 2px 6px;
  border: 1px solid transparent;
  transition: border-color 0.12s, background 0.12s;
  line-height: 1.5;
  min-height: 28px;
  display: flex;
  align-items: center;
}
.aui-inline-edit__display:hover {
  border-color: var(--border);
  background: var(--accent);
}
.aui-inline-edit__input {
  display: none;
  width: 100%;
}
/* Editing state: hide display, show input */
.aui-inline-edit.is-editing .aui-inline-edit__display { display: none; }
.aui-inline-edit.is-editing .aui-inline-edit__input   { display: block; }

/* ── tag input (chips + live input) ────────────────────────────────────── */
.aui-tag-input {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-1);
  padding: 6px var(--space-2);
  border: 1px solid var(--input);
  border-radius: var(--radius-sm);
  background: var(--background);
  min-height: 40px;
  cursor: text;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.aui-tag-input:focus-within {
  border-color: var(--ring);
  box-shadow: 0 0 0 2px color-mix(in oklch, var(--ring) 30%, transparent);
}
.aui-tag-input.is-invalid {
  border-color: var(--destructive);
  box-shadow: 0 0 0 2px color-mix(in oklch, var(--destructive) 25%, transparent);
}
/* Individual chip/tag */
.aui-tag-input__tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  border-radius: 999px;
  background: color-mix(in oklch, var(--primary) 14%, transparent);
  color: var(--primary);
  border: 1px solid color-mix(in oklch, var(--primary) 28%, transparent);
  font-size: var(--text-xs);
  font-weight: 550;
  white-space: nowrap;
  max-width: 160px;
}
.aui-tag-input__tag-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.aui-tag-input__tag-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  opacity: 0.70;
  padding: 0;
  flex-shrink: 0;
  transition: opacity 0.10s, background 0.10s;
}
.aui-tag-input__tag-remove:hover { opacity: 1; background: color-mix(in oklch, var(--primary) 20%, transparent); }
.aui-tag-input__tag-remove:focus-visible { outline: 2px solid var(--ring); outline-offset: 1px; }
/* Live input inside tag list */
.aui-tag-input__field {
  flex: 1 1 80px;
  min-width: 60px;
  border: none;
  outline: none;
  background: transparent;
  color: var(--foreground);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  padding: 0 var(--space-1);
  line-height: 1.5;
}
.aui-tag-input__field::placeholder { color: var(--muted-foreground); }

/* ── checkbox list ───────────────────────────────────────────────────────── */
.aui-checkbox-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.aui-checkbox-list__item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  cursor: pointer;
  border-radius: var(--radius-sm);
  padding: var(--space-2);
  border: 1px solid transparent;
  transition: background 0.10s, border-color 0.10s;
}
.aui-checkbox-list__item:hover {
  background: var(--accent);
  border-color: var(--border);
}
.aui-checkbox-list__item:has(.aui-checkbox:focus-visible) {
  outline: 2px solid var(--ring);
  outline-offset: 1px;
}
.aui-checkbox-list__item-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 0;
}
.aui-checkbox-list__item-label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--foreground);
  line-height: 1.35;
}
.aui-checkbox-list__item-desc {
  font-size: var(--text-xs);
  color: var(--muted-foreground);
  line-height: 1.45;
}
`;

/* ═══════════════════════════════════════════════════════════════════════════
   FORMS_DEMO_HTML
   One <section> per component group; every visible state is shown.
   States that require dynamic CSS (hover/focus) are shown via modifier
   classes where static styles exist (.is-invalid, [disabled], .is-active,
   .is-sorted-asc, .is-sorted-desc, .is-loading, .is-editing, [data-open]).
   ═══════════════════════════════════════════════════════════════════════════ */
export const FORMS_DEMO_HTML = `
<div class="aui-widget" style="max-width:860px;padding-bottom:48px">

<!-- ════════════════════════════════════════════════════════
     SECTION 1: TEXT / NUMBER INPUTS
     ════════════════════════════════════════════════════════ -->
<section aria-label="Inputs" style="margin-bottom:40px">
  <h2 style="font-size:var(--text-base);font-weight:700;letter-spacing:-0.02em;margin-bottom:var(--space-4);padding-bottom:var(--space-2);border-bottom:1px solid var(--border)">
    Inputs
  </h2>
  <div style="display:flex;flex-direction:column;gap:var(--space-4)">

    <!-- Default -->
    <div class="aui-field">
      <label class="aui-field__label" for="demo-input-default">Default (resting)</label>
      <input class="aui-input" id="demo-input-default" type="text" placeholder="Type something…" />
      <span class="aui-field__help">Helper text below the input.</span>
    </div>

    <!-- Disabled -->
    <div class="aui-field">
      <label class="aui-field__label" for="demo-input-disabled">Disabled</label>
      <input class="aui-input" id="demo-input-disabled" type="text" value="Cannot edit this" disabled />
    </div>

    <!-- Invalid -->
    <div class="aui-field aui-field--required">
      <label class="aui-field__label" for="demo-input-invalid">Email (invalid state)</label>
      <input class="aui-input is-invalid" id="demo-input-invalid" type="email" value="not-an-email" aria-invalid="true" aria-describedby="demo-input-invalid-err" />
      <span class="aui-field__error" id="demo-input-invalid-err">Enter a valid email address.</span>
    </div>

    <!-- Number with hint -->
    <div class="aui-field">
      <label class="aui-field__label" for="demo-input-number">Lead time (days)</label>
      <input class="aui-input" id="demo-input-number" type="number" value="14" min="1" max="90" />
      <span class="aui-field__hint">Typical range 1–90 days.</span>
    </div>

    <!-- Textarea -->
    <div class="aui-field">
      <label class="aui-field__label" for="demo-textarea">Description</label>
      <textarea class="aui-textarea" id="demo-textarea" rows="3" placeholder="Write a short description…"></textarea>
      <span class="aui-field__help">Markdown is supported.</span>
    </div>

    <!-- Textarea invalid -->
    <div class="aui-field">
      <label class="aui-field__label" for="demo-textarea-invalid">Notes (invalid)</label>
      <textarea class="aui-textarea is-invalid" id="demo-textarea-invalid" aria-invalid="true" aria-describedby="demo-ta-err">Too short</textarea>
      <span class="aui-field__error" id="demo-ta-err">At least 20 characters required.</span>
    </div>

  </div>
</section>

<!-- ════════════════════════════════════════════════════════
     SECTION 2: SELECT
     ════════════════════════════════════════════════════════ -->
<section aria-label="Select" style="margin-bottom:40px">
  <h2 style="font-size:var(--text-base);font-weight:700;letter-spacing:-0.02em;margin-bottom:var(--space-4);padding-bottom:var(--space-2);border-bottom:1px solid var(--border)">
    Select
  </h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:var(--space-4)">

    <div class="aui-field">
      <label class="aui-field__label" for="demo-select">Status</label>
      <select class="aui-select" id="demo-select">
        <option value="">Choose status…</option>
        <option value="on-track" selected>On track</option>
        <option value="at-risk">At risk</option>
        <option value="blocked">Blocked</option>
      </select>
    </div>

    <div class="aui-field">
      <label class="aui-field__label" for="demo-select-disabled">Disabled select</label>
      <select class="aui-select" id="demo-select-disabled" disabled>
        <option>Locked value</option>
      </select>
    </div>

    <div class="aui-field">
      <label class="aui-field__label" for="demo-select-invalid">Priority (invalid)</label>
      <select class="aui-select is-invalid" id="demo-select-invalid" aria-invalid="true">
        <option value="">Select priority…</option>
      </select>
      <span class="aui-field__error">Priority is required.</span>
    </div>

  </div>
</section>

<!-- ════════════════════════════════════════════════════════
     SECTION 3: INPUT GROUP
     ════════════════════════════════════════════════════════ -->
<section aria-label="Input groups" style="margin-bottom:40px">
  <h2 style="font-size:var(--text-base);font-weight:700;letter-spacing:-0.02em;margin-bottom:var(--space-4);padding-bottom:var(--space-2);border-bottom:1px solid var(--border)">
    Input Groups
  </h2>
  <div style="display:flex;flex-direction:column;gap:var(--space-4);max-width:400px">

    <!-- Prefix addon -->
    <div class="aui-field">
      <label class="aui-field__label" for="demo-ig-prefix">Website</label>
      <div class="aui-input-group">
        <span class="aui-input-group__addon">https://</span>
        <input class="aui-input" id="demo-ig-prefix" type="text" placeholder="yourdomain.com" />
      </div>
    </div>

    <!-- Suffix addon -->
    <div class="aui-field">
      <label class="aui-field__label" for="demo-ig-suffix">Price</label>
      <div class="aui-input-group">
        <input class="aui-input" id="demo-ig-suffix" type="number" value="149" />
        <span class="aui-input-group__addon">USD</span>
      </div>
    </div>

    <!-- Both sides -->
    <div class="aui-field">
      <label class="aui-field__label" for="demo-ig-both">Budget</label>
      <div class="aui-input-group">
        <span class="aui-input-group__addon">$</span>
        <input class="aui-input" id="demo-ig-both" type="number" value="5000" />
        <span class="aui-input-group__addon">.00</span>
      </div>
    </div>

  </div>
</section>

<!-- ════════════════════════════════════════════════════════
     SECTION 4: CHECKBOX, RADIO, SWITCH
     ════════════════════════════════════════════════════════ -->
<section aria-label="Checkboxes, radios, switches" style="margin-bottom:40px">
  <h2 style="font-size:var(--text-base);font-weight:700;letter-spacing:-0.02em;margin-bottom:var(--space-4);padding-bottom:var(--space-2);border-bottom:1px solid var(--border)">
    Checkbox / Radio / Switch
  </h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:var(--space-5)">

    <!-- Checkboxes -->
    <div>
      <p style="font-size:var(--text-xs);font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--muted-foreground);margin-bottom:var(--space-3)">Checkboxes</p>
      <div style="display:flex;flex-direction:column;gap:var(--space-3)">
        <label class="aui-field--inline aui-field" style="cursor:pointer">
          <input class="aui-checkbox" type="checkbox" checked id="chk-a" />
          <span class="aui-field__label" style="cursor:pointer" for="chk-a">Checked</span>
        </label>
        <label class="aui-field--inline aui-field" style="cursor:pointer">
          <input class="aui-checkbox" type="checkbox" id="chk-b" />
          <span class="aui-field__label" style="cursor:pointer">Unchecked</span>
        </label>
        <label class="aui-field--inline aui-field" style="cursor:pointer">
          <input class="aui-checkbox" type="checkbox" disabled id="chk-c" />
          <span class="aui-field__label" style="cursor:pointer;opacity:0.45">Disabled unchecked</span>
        </label>
        <label class="aui-field--inline aui-field" style="cursor:pointer">
          <input class="aui-checkbox" type="checkbox" disabled checked id="chk-d" />
          <span class="aui-field__label" style="cursor:pointer;opacity:0.45">Disabled checked</span>
        </label>
      </div>
    </div>

    <!-- Radios -->
    <div>
      <p style="font-size:var(--text-xs);font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--muted-foreground);margin-bottom:var(--space-3)">Radio buttons</p>
      <div style="display:flex;flex-direction:column;gap:var(--space-3)" role="radiogroup" aria-label="Priority">
        <label class="aui-field--inline aui-field" style="cursor:pointer">
          <input class="aui-radio" type="radio" name="demo-priority" value="high" checked id="radio-high" />
          <span class="aui-field__label" style="cursor:pointer">High priority</span>
        </label>
        <label class="aui-field--inline aui-field" style="cursor:pointer">
          <input class="aui-radio" type="radio" name="demo-priority" value="medium" id="radio-med" />
          <span class="aui-field__label" style="cursor:pointer">Medium priority</span>
        </label>
        <label class="aui-field--inline aui-field" style="cursor:pointer">
          <input class="aui-radio" type="radio" name="demo-priority" value="low" disabled id="radio-low" />
          <span class="aui-field__label" style="cursor:pointer;opacity:0.45">Low (disabled)</span>
        </label>
      </div>
    </div>

    <!-- Switches -->
    <div>
      <p style="font-size:var(--text-xs);font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--muted-foreground);margin-bottom:var(--space-3)">Switches</p>
      <div style="display:flex;flex-direction:column;gap:var(--space-3)">
        <label class="aui-field--inline aui-field" style="cursor:pointer">
          <input class="aui-switch" type="checkbox" checked id="sw-a" />
          <span class="aui-field__label" style="cursor:pointer">Notifications on</span>
        </label>
        <label class="aui-field--inline aui-field" style="cursor:pointer">
          <input class="aui-switch" type="checkbox" id="sw-b" />
          <span class="aui-field__label" style="cursor:pointer">Auto-archive off</span>
        </label>
        <label class="aui-field--inline aui-field" style="cursor:pointer">
          <input class="aui-switch" type="checkbox" disabled id="sw-c" />
          <span class="aui-field__label" style="cursor:pointer;opacity:0.45">Disabled switch</span>
        </label>
      </div>
    </div>

  </div>
</section>

<!-- ════════════════════════════════════════════════════════
     SECTION 5: CHECKBOX LIST
     ════════════════════════════════════════════════════════ -->
<section aria-label="Checkbox list" style="margin-bottom:40px">
  <h2 style="font-size:var(--text-base);font-weight:700;letter-spacing:-0.02em;margin-bottom:var(--space-4);padding-bottom:var(--space-2);border-bottom:1px solid var(--border)">
    Checkbox List
  </h2>
  <div style="max-width:440px">
    <div class="aui-checkbox-list" role="group" aria-label="Notification channels">
      <label class="aui-checkbox-list__item">
        <input class="aui-checkbox" type="checkbox" checked />
        <div class="aui-checkbox-list__item-content">
          <span class="aui-checkbox-list__item-label">Email notifications</span>
          <span class="aui-checkbox-list__item-desc">Receive updates via your registered email address.</span>
        </div>
      </label>
      <label class="aui-checkbox-list__item">
        <input class="aui-checkbox" type="checkbox" />
        <div class="aui-checkbox-list__item-content">
          <span class="aui-checkbox-list__item-label">Slack integration</span>
          <span class="aui-checkbox-list__item-desc">Post events to a configured Slack channel.</span>
        </div>
      </label>
      <label class="aui-checkbox-list__item">
        <input class="aui-checkbox" type="checkbox" disabled />
        <div class="aui-checkbox-list__item-content" style="opacity:0.45">
          <span class="aui-checkbox-list__item-label">SMS (disabled)</span>
          <span class="aui-checkbox-list__item-desc">Not available on this plan.</span>
        </div>
      </label>
    </div>
  </div>
</section>

<!-- ════════════════════════════════════════════════════════
     SECTION 6: FORM LAYOUT
     ════════════════════════════════════════════════════════ -->
<section aria-label="Form layout" style="margin-bottom:40px">
  <h2 style="font-size:var(--text-base);font-weight:700;letter-spacing:-0.02em;margin-bottom:var(--space-4);padding-bottom:var(--space-2);border-bottom:1px solid var(--border)">
    Form Layout
  </h2>
  <div class="aui-card" style="max-width:600px">
    <form class="aui-form" novalidate>

      <div class="aui-form-grid">
        <div class="aui-field aui-field--required">
          <label class="aui-field__label" for="fl-first">First name</label>
          <input class="aui-input" id="fl-first" type="text" placeholder="Ada" />
        </div>
        <div class="aui-field aui-field--required">
          <label class="aui-field__label" for="fl-last">Last name</label>
          <input class="aui-input" id="fl-last" type="text" placeholder="Lovelace" />
        </div>
        <div class="aui-field aui-field--required aui-field--full">
          <label class="aui-field__label" for="fl-email">Email address</label>
          <input class="aui-input" id="fl-email" type="email" placeholder="ada@example.com" />
        </div>
      </div>

      <fieldset class="aui-fieldset">
        <legend class="aui-fieldset__legend">Notification preferences</legend>
        <div class="aui-form-grid">
          <label class="aui-field--inline aui-field">
            <input class="aui-switch" type="checkbox" checked />
            <span class="aui-field__label" style="color:var(--foreground);font-size:var(--text-sm);font-weight:500;letter-spacing:0">Weekly digest</span>
          </label>
          <label class="aui-field--inline aui-field">
            <input class="aui-switch" type="checkbox" />
            <span class="aui-field__label" style="color:var(--foreground);font-size:var(--text-sm);font-weight:500;letter-spacing:0">Marketing emails</span>
          </label>
        </div>
      </fieldset>

      <div class="aui-form-actions">
        <button class="aui-btn" type="button">Cancel</button>
        <button class="aui-btn aui-btn--primary" type="submit">Save changes</button>
      </div>

    </form>
  </div>
</section>

<!-- ════════════════════════════════════════════════════════
     SECTION 7: BUTTONS
     ════════════════════════════════════════════════════════ -->
<section aria-label="Buttons" style="margin-bottom:40px">
  <h2 style="font-size:var(--text-base);font-weight:700;letter-spacing:-0.02em;margin-bottom:var(--space-4);padding-bottom:var(--space-2);border-bottom:1px solid var(--border)">
    Buttons
  </h2>

  <!-- Variants row -->
  <div style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4)">
    <button class="aui-btn aui-btn--primary">Primary</button>
    <button class="aui-btn">Default</button>
    <button class="aui-btn aui-btn--outline">Outline</button>
    <button class="aui-btn aui-btn--ghost">Ghost</button>
    <button class="aui-btn aui-btn--destructive">Destructive</button>
    <button class="aui-btn aui-btn--sm">Small</button>
    <button class="aui-btn" disabled>Disabled</button>
  </div>

  <!-- Loading states -->
  <div style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4)">
    <button class="aui-btn aui-btn--primary is-loading" aria-busy="true" aria-label="Saving…">Saving…</button>
    <button class="aui-btn is-loading" aria-busy="true" aria-label="Loading">Loading</button>
    <button class="aui-btn aui-btn--destructive is-loading" aria-busy="true" aria-label="Deleting">Deleting</button>
  </div>

  <!-- Icon buttons -->
  <div style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-3);margin-bottom:var(--space-4)">
    <button class="aui-btn aui-btn--icon" aria-label="Edit">
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 1.5L13.5 4.5L5 13H2V10L10.5 1.5Z"/></svg>
    </button>
    <button class="aui-btn aui-btn--icon aui-btn--ghost" aria-label="Delete">
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h9M6 3V2h3v1M5 6l.5 6M10 6l-.5 6M2 3h11"/></svg>
    </button>
    <button class="aui-btn aui-btn--icon aui-btn--sm" aria-label="Add">
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><line x1="6.5" y1="2" x2="6.5" y2="11"/><line x1="2" y1="6.5" x2="11" y2="6.5"/></svg>
    </button>
  </div>

  <!-- Button group -->
  <div style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--space-5);margin-bottom:var(--space-4)">
    <div class="aui-btn-group" role="group" aria-label="View mode">
      <button class="aui-btn is-active">List</button>
      <button class="aui-btn">Board</button>
      <button class="aui-btn">Timeline</button>
    </div>
    <div class="aui-btn-group" role="group" aria-label="Actions">
      <button class="aui-btn aui-btn--primary">Save</button>
      <button class="aui-btn aui-btn--primary aui-btn--icon" aria-label="More options">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2 6.5L6.5 11L11 6.5"/></svg>
      </button>
    </div>
  </div>

  <!-- Block button -->
  <div style="max-width:320px">
    <button class="aui-btn aui-btn--primary aui-btn--block">Create new project</button>
  </div>
</section>

<!-- ════════════════════════════════════════════════════════
     SECTION 8: DATA TABLE
     ════════════════════════════════════════════════════════ -->
<section aria-label="Data table" style="margin-bottom:40px">
  <h2 style="font-size:var(--text-base);font-weight:700;letter-spacing:-0.02em;margin-bottom:var(--space-4);padding-bottom:var(--space-2);border-bottom:1px solid var(--border)">
    Data Table
  </h2>

  <div class="aui-table-wrap" style="margin-bottom:var(--space-5)">
    <table class="aui-table aui-table--zebra">
      <thead>
        <tr>
          <th tabindex="0" class="aui-th--sortable is-sorted-asc">Task</th>
          <th tabindex="0" class="aui-th--sortable">Assignee</th>
          <th tabindex="0" class="aui-th--sortable is-sorted-desc aui-th--num">Lead time (d)</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Redesign onboarding flow</td>
          <td>Ada Lovelace</td>
          <td class="aui-td--num">12</td>
          <td><span class="aui-badge aui-badge--on-track">On track</span></td>
          <td>
            <div class="aui-table__cell-actions">
              <button class="aui-btn aui-btn--icon aui-btn--ghost aui-btn--sm" aria-label="Edit">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 1.5L11.5 4L4.5 11H2V8.5L9 1.5Z"/></svg>
              </button>
              <button class="aui-btn aui-btn--icon aui-btn--ghost aui-btn--sm" aria-label="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2 3h9M5.5 3V2h2v1M4 5l.4 5.5M9 5l-.4 5.5M1.5 3h10"/></svg>
              </button>
            </div>
          </td>
        </tr>
        <tr>
          <td>Migrate auth to Clerk</td>
          <td>Grace Hopper</td>
          <td class="aui-td--num">7</td>
          <td><span class="aui-badge aui-badge--at-risk">At risk</span></td>
          <td>
            <div class="aui-table__cell-actions">
              <button class="aui-btn aui-btn--icon aui-btn--ghost aui-btn--sm" aria-label="Edit">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 1.5L11.5 4L4.5 11H2V8.5L9 1.5Z"/></svg>
              </button>
              <button class="aui-btn aui-btn--icon aui-btn--ghost aui-btn--sm" aria-label="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2 3h9M5.5 3V2h2v1M4 5l.4 5.5M9 5l-.4 5.5M1.5 3h10"/></svg>
              </button>
            </div>
          </td>
        </tr>
        <tr>
          <td>Write API documentation</td>
          <td>Margaret Hamilton</td>
          <td class="aui-td--num">3</td>
          <td><span class="aui-badge aui-badge--done">Done</span></td>
          <td>
            <div class="aui-table__cell-actions">
              <button class="aui-btn aui-btn--icon aui-btn--ghost aui-btn--sm" aria-label="Edit">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 1.5L11.5 4L4.5 11H2V8.5L9 1.5Z"/></svg>
              </button>
              <button class="aui-btn aui-btn--icon aui-btn--ghost aui-btn--sm" aria-label="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2 3h9M5.5 3V2h2v1M4 5l.4 5.5M9 5l-.4 5.5M1.5 3h10"/></svg>
              </button>
            </div>
          </td>
        </tr>
        <tr>
          <td>Fix checkout regression</td>
          <td>Dorothy Vaughan</td>
          <td class="aui-td--num">21</td>
          <td><span class="aui-badge aui-badge--blocked">Blocked</span></td>
          <td>
            <div class="aui-table__cell-actions">
              <button class="aui-btn aui-btn--icon aui-btn--ghost aui-btn--sm" aria-label="Edit">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 1.5L11.5 4L4.5 11H2V8.5L9 1.5Z"/></svg>
              </button>
              <button class="aui-btn aui-btn--icon aui-btn--ghost aui-btn--sm" aria-label="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2 3h9M5.5 3V2h2v1M4 5l.4 5.5M9 5l-.4 5.5M1.5 3h10"/></svg>
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Empty state table -->
  <div class="aui-table-wrap" style="margin-bottom:var(--space-5)">
    <table class="aui-table" aria-label="Empty table example">
      <thead>
        <tr>
          <th>Task</th><th>Assignee</th><th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr class="aui-table__empty">
          <td colspan="3">
            <div style="display:flex;flex-direction:column;align-items:center;gap:var(--space-2)">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" opacity="0.4"><rect x="4" y="6" width="24" height="20" rx="3"/><path d="M4 12h24M10 18h4M10 22h8"/></svg>
              <span>No tasks yet — <button class="aui-btn aui-btn--ghost aui-btn--sm" style="display:inline-flex;vertical-align:baseline;padding:2px 6px">create the first one</button></span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Pagination -->
  <nav class="aui-pagination" aria-label="Page navigation">
    <button class="aui-pagination__btn" disabled aria-label="Previous page">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 10.5L5 7l3.5-3.5"/></svg>
    </button>
    <button class="aui-pagination__btn is-current" aria-current="page" aria-label="Page 1">1</button>
    <button class="aui-pagination__btn" aria-label="Page 2">2</button>
    <button class="aui-pagination__btn" aria-label="Page 3">3</button>
    <span class="aui-pagination__ellipsis" aria-hidden="true">…</span>
    <button class="aui-pagination__btn" aria-label="Page 12">12</button>
    <button class="aui-pagination__btn" aria-label="Next page">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 3.5L9 7l-3.5 3.5"/></svg>
    </button>
  </nav>
</section>

<!-- ════════════════════════════════════════════════════════
     SECTION 9: DIALOG
     ════════════════════════════════════════════════════════ -->
<section aria-label="Dialog" style="margin-bottom:40px">
  <h2 style="font-size:var(--text-base);font-weight:700;letter-spacing:-0.02em;margin-bottom:var(--space-4);padding-bottom:var(--space-2);border-bottom:1px solid var(--border)">
    Dialog (modal scaffold)
  </h2>
  <p style="font-size:var(--text-sm);color:var(--muted-foreground);margin-bottom:var(--space-4)">
    Dialog panel shown inline here (without backdrop) for showcase. In production, use native
    <code style="font-family:var(--font-mono);font-size:var(--text-xs);background:var(--muted);padding:1px 5px;border-radius:4px">&lt;dialog&gt;</code>
    with <code style="font-family:var(--font-mono);font-size:var(--text-xs);background:var(--muted);padding:1px 5px;border-radius:4px">showModal()</code>
    or toggle <code style="font-family:var(--font-mono);font-size:var(--text-xs);background:var(--muted);padding:1px 5px;border-radius:4px">[data-open]</code>.
  </p>
  <!-- Inline showcase of panel only -->
  <div style="max-width:480px;border:1px solid var(--border);border-radius:var(--radius-lg)">
    <div class="aui-dialog__panel" style="animation:none;position:static;max-height:none;box-shadow:none;border-radius:var(--radius-lg)">
      <div class="aui-dialog__head">
        <span class="aui-dialog__title">Delete project</span>
        <button class="aui-dialog__close" aria-label="Close">&times;</button>
      </div>
      <div class="aui-dialog__body">
        <div class="aui-alert aui-alert--destructive" style="margin-bottom:var(--space-4)">
          <div class="aui-alert__icon">&#9888;</div>
          <div class="aui-alert__body">
            <div class="aui-alert__title">This action is irreversible</div>
            <div class="aui-alert__desc">All tasks, comments, and history will be permanently deleted.</div>
          </div>
        </div>
        <div class="aui-field aui-field--required">
          <label class="aui-field__label" for="dlg-confirm">Type <strong>delete</strong> to confirm</label>
          <input class="aui-input" id="dlg-confirm" type="text" placeholder="delete" />
        </div>
      </div>
      <div class="aui-dialog__foot">
        <button class="aui-btn">Cancel</button>
        <button class="aui-btn aui-btn--destructive">Delete project</button>
      </div>
    </div>
  </div>
</section>

<!-- ════════════════════════════════════════════════════════
     SECTION 10: TOASTS
     ════════════════════════════════════════════════════════ -->
<section aria-label="Toasts" style="margin-bottom:40px">
  <h2 style="font-size:var(--text-base);font-weight:700;letter-spacing:-0.02em;margin-bottom:var(--space-4);padding-bottom:var(--space-2);border-bottom:1px solid var(--border)">
    Toasts
  </h2>
  <p style="font-size:var(--text-sm);color:var(--muted-foreground);margin-bottom:var(--space-4)">
    Shown inline here. In production, place <code style="font-family:var(--font-mono);font-size:var(--text-xs);background:var(--muted);padding:1px 5px;border-radius:4px">.aui-toast-stack</code> at document root (fixed bottom-right, z-60).
  </p>
  <div style="display:flex;flex-direction:column;gap:var(--space-3);max-width:360px">
    <div class="aui-toast aui-toast--success" role="status" aria-live="polite">
      <div class="aui-toast__icon">&#10003;</div>
      <div class="aui-toast__body">
        <div class="aui-toast__title">Changes saved</div>
        <div class="aui-toast__desc">Your project settings have been updated successfully.</div>
      </div>
    </div>
    <div class="aui-toast aui-toast--warning" role="status" aria-live="polite">
      <div class="aui-toast__icon">&#9888;</div>
      <div class="aui-toast__body">
        <div class="aui-toast__title">WIP limit exceeded</div>
        <div class="aui-toast__desc">Column "In Dev" has 6 items (limit is 5).</div>
      </div>
    </div>
    <div class="aui-toast aui-toast--destructive" role="alert" aria-live="assertive">
      <div class="aui-toast__icon">&#9747;</div>
      <div class="aui-toast__body">
        <div class="aui-toast__title">Export failed</div>
        <div class="aui-toast__desc">Connection timed out. Retry or contact support.</div>
      </div>
    </div>
    <div class="aui-toast aui-toast--info" role="status" aria-live="polite">
      <div class="aui-toast__icon">&#8505;</div>
      <div class="aui-toast__body">
        <div class="aui-toast__title">New release available</div>
        <div class="aui-toast__desc">Version 0.7.0 is ready — refresh to update.</div>
      </div>
    </div>
  </div>
</section>

<!-- ════════════════════════════════════════════════════════
     SECTION 11: ALERTS (inline)
     ════════════════════════════════════════════════════════ -->
<section aria-label="Alerts" style="margin-bottom:40px">
  <h2 style="font-size:var(--text-base);font-weight:700;letter-spacing:-0.02em;margin-bottom:var(--space-4);padding-bottom:var(--space-2);border-bottom:1px solid var(--border)">
    Alerts (inline)
  </h2>
  <div style="display:flex;flex-direction:column;gap:var(--space-3);max-width:560px">
    <div class="aui-alert aui-alert--success" role="status">
      <div class="aui-alert__icon">&#10003;</div>
      <div class="aui-alert__body">
        <div class="aui-alert__title">Deployment successful</div>
        <div class="aui-alert__desc">v1.2.4 is live on production. No rollback needed.</div>
      </div>
    </div>
    <div class="aui-alert aui-alert--warning" role="status">
      <div class="aui-alert__icon">&#9888;</div>
      <div class="aui-alert__body">
        <div class="aui-alert__title">High cycle time detected</div>
        <div class="aui-alert__desc">3 items have been in "In Review" for more than 7 days.</div>
      </div>
    </div>
    <div class="aui-alert aui-alert--destructive" role="alert">
      <div class="aui-alert__icon">&#9747;</div>
      <div class="aui-alert__body">
        <div class="aui-alert__title">Integration error</div>
        <div class="aui-alert__desc">GitHub webhook returned 401 Unauthorized. Check your token.</div>
      </div>
    </div>
    <div class="aui-alert aui-alert--info" role="status">
      <div class="aui-alert__icon">&#8505;</div>
      <div class="aui-alert__body">
        <div class="aui-alert__title">Tip: keyboard shortcuts</div>
        <div class="aui-alert__desc">Press <kbd style="font-family:var(--font-mono);font-size:var(--text-xs);background:var(--muted);border:1px solid var(--border);border-bottom-width:2px;border-radius:4px;padding:1px 5px">?</kbd> at any time to view available actions.</div>
      </div>
    </div>
  </div>
</section>

<!-- ════════════════════════════════════════════════════════
     SECTION 12: INLINE EDIT
     ════════════════════════════════════════════════════════ -->
<section aria-label="Inline edit" style="margin-bottom:40px">
  <h2 style="font-size:var(--text-base);font-weight:700;letter-spacing:-0.02em;margin-bottom:var(--space-4);padding-bottom:var(--space-2);border-bottom:1px solid var(--border)">
    Inline Edit
  </h2>
  <div style="display:flex;flex-direction:column;gap:var(--space-4)">

    <!-- Resting state (display mode) -->
    <div>
      <p style="font-size:var(--text-xs);color:var(--muted-foreground);margin-bottom:var(--space-2)">Display mode (click to edit)</p>
      <div class="aui-inline-edit">
        <div class="aui-inline-edit__display" tabindex="0" role="button" aria-label="Edit project name">
          Onboarding Redesign Q3
        </div>
        <input class="aui-input aui-inline-edit__input" type="text" value="Onboarding Redesign Q3" />
      </div>
    </div>

    <!-- Editing state (is-editing class active) -->
    <div>
      <p style="font-size:var(--text-xs);color:var(--muted-foreground);margin-bottom:var(--space-2)">Edit mode (.is-editing)</p>
      <div class="aui-inline-edit is-editing" style="max-width:300px">
        <div class="aui-inline-edit__display" tabindex="0" role="button" aria-label="Edit project name">
          Onboarding Redesign Q3
        </div>
        <input class="aui-input aui-inline-edit__input" type="text" value="Onboarding Redesign Q3" />
      </div>
    </div>

  </div>
</section>

<!-- ════════════════════════════════════════════════════════
     SECTION 13: TAG INPUT
     ════════════════════════════════════════════════════════ -->
<section aria-label="Tag input" style="margin-bottom:40px">
  <h2 style="font-size:var(--text-base);font-weight:700;letter-spacing:-0.02em;margin-bottom:var(--space-4);padding-bottom:var(--space-2);border-bottom:1px solid var(--border)">
    Tag Input
  </h2>
  <div style="max-width:480px">
    <div class="aui-field">
      <label class="aui-field__label">Labels</label>
      <div class="aui-tag-input" role="group" aria-label="Tag input — press Enter to add, Backspace to remove">
        <span class="aui-tag-input__tag">
          <span class="aui-tag-input__tag-label">design-system</span>
          <button class="aui-tag-input__tag-remove" aria-label="Remove tag design-system" type="button">&times;</button>
        </span>
        <span class="aui-tag-input__tag">
          <span class="aui-tag-input__tag-label">frontend</span>
          <button class="aui-tag-input__tag-remove" aria-label="Remove tag frontend" type="button">&times;</button>
        </span>
        <span class="aui-tag-input__tag">
          <span class="aui-tag-input__tag-label">accessibility</span>
          <button class="aui-tag-input__tag-remove" aria-label="Remove tag accessibility" type="button">&times;</button>
        </span>
        <input class="aui-tag-input__field" type="text" placeholder="Add label…" aria-label="New tag" />
      </div>
      <span class="aui-field__help">Press Enter to add, Backspace to remove the last tag.</span>
    </div>

    <!-- Invalid state -->
    <div class="aui-field" style="margin-top:var(--space-4)">
      <label class="aui-field__label">Tags (invalid)</label>
      <div class="aui-tag-input is-invalid" role="group">
        <input class="aui-tag-input__field" type="text" placeholder="Add tag…" aria-invalid="true" />
      </div>
      <span class="aui-field__error">At least one tag is required.</span>
    </div>
  </div>
</section>

</div>
`;
