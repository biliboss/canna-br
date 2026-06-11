/**
 * htmlShell — assembles a self-contained MCP-App HTML document for one widget.
 *
 * Injection order inside <style>:  TOKENS → ATOMS → MOLECULES → extraCss
 * Injection order inside <script>: __DATA__ → CHARTS_JS → BRIDGE_JS → renderJs → init
 *
 * The widget's renderJs MUST define `function render(data) {...}` (idempotent —
 * called once with baked data, again on every live tool-result). It MAY also
 * define `function onTheme(theme)` and `function onInput(args)`.
 */
import { TOKENS_CSS } from "./tokens.js";
import { ATOMS_CSS } from "./atoms.js";
import { MOLECULES_CSS } from "./molecules.js";
import { BRIDGE_JS } from "./bridge.js";
import { CHARTS_JS } from "./charts.js";
import { ECHARTS_JS, ECHARTS_THEME_JS } from "./echarts.js";
import { FORMS_CSS } from "./forms.js";

export interface ShellOptions {
  /** widget title shown in the header */
  title: string;
  /** category tag in the header (Metrics / Flow / Flight Levels) */
  categoryLabel: string;
  /** one-line description under the title (optional) */
  subtitle?: string;
  /** data baked as window.__DATA__ for standalone render */
  data: unknown;
  /** widget body markup, mounted inside #aui-body */
  bodyHtml: string;
  /** the widget's render script — defines render(data) */
  renderJs: string;
  /** optional per-widget CSS */
  extraCss?: string;
  /** inline the tree-shaken ECharts bundle + AuiECharts theme bridge */
  echarts?: boolean;
  /** full-bleed: drop the 760px max-width (e.g. for full-width chat embeds) */
  wide?: boolean;
  /** inject the CRUD forms CSS (inputs/select/table/dialog/toast/inline-edit/…) */
  forms?: boolean;
}

/** Embed JSON safely inside a <script> tag (escape < and the JS line terminators). */
function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function htmlShell(opts: ShellOptions): string {
  const subtitle = opts.subtitle
    ? `<p class="aui-widget__subtitle">${opts.subtitle}</p>`
    : "";
  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${opts.title}</title>
<style>
${TOKENS_CSS}
${ATOMS_CSS}
${MOLECULES_CSS}
${opts.forms ? FORMS_CSS : ""}
${opts.extraCss ?? ""}
</style>
</head>
<body>
<main class="aui-widget" data-category="${opts.categoryLabel}"${opts.wide ? " data-wide" : ""}>
  <header class="aui-widget__head">
    <div class="aui-widget__heading">
      <h1 class="aui-widget__title">${opts.title}</h1>
      ${subtitle}
    </div>
    <span class="aui-badge aui-badge--category">${opts.categoryLabel}</span>
  </header>
  <div id="aui-body" class="aui-widget__body">
${opts.bodyHtml}
  </div>
</main>
<script>window.__DATA__ = ${safeJson(opts.data)};</script>
<script>${CHARTS_JS}</script>
<script>${BRIDGE_JS}</script>
${opts.echarts ? `<script>${ECHARTS_JS}</script>\n<script>${ECHARTS_THEME_JS}</script>` : ""}
<script>
${opts.renderJs}
</script>
<script>
AuiBridge.init({
  onData: (typeof render === 'function') ? render : null,
  onInput: (typeof onInput === 'function') ? onInput : null,
  onTheme: (typeof onTheme === 'function') ? onTheme : null
});
</script>
</body>
</html>`;
}
