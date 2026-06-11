/**
 * Hand-made component showcase ("kitchen sink") — NOT Storybook.
 *
 * Imports the EXACT same design-system CSS strings the widgets use, so the
 * catalog can never drift from production. Renders every atom / molecule /
 * label / control / chart in all available states, with a live dark/light
 * theme toggle. Served at GET /showcase. Forms section is injected when
 * kit/forms.ts exists (passed in by the route via dynamic import).
 *
 * State coverage is honest: static states (disabled, invalid, active, over,
 * sorted) are rendered as explicit markup; hover/focus are live (just hover).
 */
import { TOKENS_CSS } from "./tokens.js";
import { ATOMS_CSS } from "./atoms.js";
import { MOLECULES_CSS } from "./molecules.js";
import { CHARTS_JS } from "./charts.js";
import { ECHARTS_JS, ECHARTS_THEME_JS } from "./echarts.js";

export interface ShowcaseOptions {
  /** FORMS_CSS from kit/forms.ts when available */
  formsCss?: string;
  /** FORMS_DEMO_HTML from kit/forms.ts when available */
  formsDemo?: string;
}

const COLOR_TOKENS = [
  "background", "foreground", "card", "card-foreground",
  "muted", "muted-foreground", "border", "input", "ring",
  "primary", "primary-foreground", "accent", "accent-foreground",
  "success", "warning", "destructive",
  "on-track", "at-risk", "aging", "done", "blocked",
  "cos-expedite", "cos-fixed-date", "cos-standard", "cos-intangible",
  "fl-1", "fl-2", "fl-3",
  "chart-1", "chart-2", "chart-3", "chart-4",
  "chart-5", "chart-6", "chart-7", "chart-8",
];

function swatches(): string {
  return COLOR_TOKENS.map(
    (t) =>
      `<div class="sw"><span class="sw__chip" style="background:var(--${t})"></span>` +
      `<code class="sw__name">--${t}</code><code class="sw__val" data-token="${t}"></code></div>`,
  ).join("");
}

const BADGES = `
<div class="row"><b class="row__cap">Status</b>
  <span class="aui-badge aui-badge--on-track">On track</span>
  <span class="aui-badge aui-badge--at-risk">At risk</span>
  <span class="aui-badge aui-badge--aging">Aging</span>
  <span class="aui-badge aui-badge--blocked">Blocked</span>
  <span class="aui-badge aui-badge--done">Done</span>
</div>
<div class="row"><b class="row__cap">Class of service</b>
  <span class="aui-badge aui-badge--expedite">Expedite</span>
  <span class="aui-badge aui-badge--fixed-date">Fixed date</span>
  <span class="aui-badge aui-badge--standard">Standard</span>
  <span class="aui-badge aui-badge--intangible">Intangible</span>
</div>
<div class="row"><b class="row__cap">Flight level</b>
  <span class="aui-badge aui-badge--fl3">FL3 Strategy</span>
  <span class="aui-badge aui-badge--fl2">FL2 Coordination</span>
  <span class="aui-badge aui-badge--fl1">FL1 Operational</span>
</div>
<div class="row"><b class="row__cap">Semantic</b>
  <span class="aui-badge aui-badge--neutral">Neutral</span>
  <span class="aui-badge aui-badge--primary">Primary</span>
  <span class="aui-badge aui-badge--success">Success</span>
  <span class="aui-badge aui-badge--warning">Warning</span>
  <span class="aui-badge aui-badge--destructive">Destructive</span>
  <span class="aui-badge aui-badge--category">Category</span>
</div>`;

const BUTTONS = `
<div class="row"><b class="row__cap">Variants</b>
  <button class="aui-btn">Default</button>
  <button class="aui-btn aui-btn--primary">Primary</button>
  <button class="aui-btn aui-btn--ghost">Ghost</button>
</div>
<div class="row"><b class="row__cap">Sizes / states</b>
  <button class="aui-btn aui-btn--sm">Small</button>
  <button class="aui-btn aui-btn--primary" disabled>Disabled</button>
  <button class="aui-btn">Hover / focus me</button>
</div>`;

const STATS = `
<div class="aui-kpis">
  <div class="aui-statcard"><div class="aui-statcard__row">
    <div class="aui-stat aui-stat--down"><span class="aui-stat__label">Cycle Time 85%</span>
      <span><span class="aui-stat__value">9</span><span class="aui-stat__unit">d</span></span>
      <span class="aui-stat__delta">&#8595; 12%</span></div>
    <div class="aui-statcard__spark" id="sc-spark-1"></div></div></div>
  <div class="aui-statcard"><div class="aui-statcard__row">
    <div class="aui-stat aui-stat--up"><span class="aui-stat__label">Throughput</span>
      <span><span class="aui-stat__value">7</span><span class="aui-stat__unit">/wk</span></span>
      <span class="aui-stat__delta">&#8593; 15%</span></div>
    <div class="aui-statcard__spark" id="sc-spark-2"></div></div></div>
  <div class="aui-statcard"><div class="aui-statcard__row">
    <div class="aui-stat"><span class="aui-stat__label">WIP</span>
      <span><span class="aui-stat__value">14</span><span class="aui-stat__unit">items</span></span>
      <span class="aui-stat__delta">&#8594; 0%</span></div>
    <div class="aui-statcard__spark" id="sc-spark-3"></div></div></div>
</div>`;

const MISC_ATOMS = `
<div class="row"><b class="row__cap">Chips</b>
  <span class="aui-chip">label</span><span class="aui-chip">3d old</span><span class="aui-chip">PR #42</span>
</div>
<div class="row"><b class="row__cap">Progress</b>
  <div style="flex:1;max-width:200px"><div class="aui-progress"><div class="aui-progress__bar" style="width:55%"></div></div></div>
  <div style="flex:1;max-width:200px"><div class="aui-progress aui-progress--over"><div class="aui-progress__bar" style="width:120%"></div></div></div>
</div>
<div class="row"><b class="row__cap">Kbd</b>
  <span class="aui-kbd">Tab</span><span class="aui-kbd">&#8984;K</span><span class="aui-kbd">Enter</span>
</div>
<div class="row"><b class="row__cap">Card</b>
  <div class="aui-card" style="max-width:280px">A surface container. Holds content with border, radius, and elevation.</div>
</div>`;

const MOLECULES_DEMO = `
<h3 class="sub">Legend</h3>
<div class="aui-legend">
  <span class="aui-legend__item"><span class="aui-legend__swatch" style="background:var(--chart-1)"></span>Done</span>
  <span class="aui-legend__item"><span class="aui-legend__swatch" style="background:var(--chart-2)"></span>In Test</span>
  <span class="aui-legend__item"><span class="aui-legend__swatch" style="background:var(--chart-3)"></span>In Dev</span>
  <span class="aui-legend__item"><span class="aui-legend__swatch" style="background:var(--chart-4)"></span>Backlog</span>
</div>
<h3 class="sub">Tooltip</h3>
<div class="aui-tooltip" style="position:static;display:inline-block">
  <div><b>Jun 03</b></div><div><span class="k">Cycle time:</span> <b>9d</b></div>
  <div><span class="k">Class:</span> <b>Standard</b></div>
</div>
<h3 class="sub">Controls</h3>
<div class="aui-toolbar">
  <div class="aui-segment">
    <button class="aui-segment__btn is-active">All</button>
    <button class="aui-segment__btn">50</button>
    <button class="aui-segment__btn">85</button>
    <button class="aui-segment__btn">95</button>
  </div>
  <div class="aui-field" style="min-width:200px">
    <label class="aui-field__label"><span>Forecast horizon</span><span>14 days</span></label>
    <input class="aui-slider" type="range" min="5" max="60" value="14" />
  </div>
</div>
<h3 class="sub">Board column</h3>
<div class="aui-board" style="max-width:340px">
  <div class="aui-col">
    <div class="aui-col__head"><span class="aui-col__title">Dev</span><span class="aui-col__count over">7/5</span></div>
    <div class="aui-cardlet cos-standard"><div class="aui-cardlet__title">Refactor auth middleware</div>
      <div class="aui-cardlet__meta"><span class="aui-badge aui-badge--standard">Standard</span><span class="aui-chip">5d</span></div></div>
    <div class="aui-cardlet cos-expedite blocked"><div class="aui-cardlet__title">Hotfix payment webhook</div>
      <div class="aui-cardlet__meta"><span class="aui-badge aui-badge--expedite">Expedite</span><span class="aui-badge aui-badge--blocked">Blocked</span></div></div>
  </div>
</div>
<h3 class="sub">Flight Levels lanes</h3>
<div class="aui-fl">
  <div class="aui-fl__lane fl3"><div class="aui-fl__lane-head"><span class="aui-badge aui-badge--fl3">FL3</span><h3>Strategy</h3><span class="sub">2 bets</span></div>
    <div class="aui-fl__items"><span class="aui-chip">Expand SMB</span><span class="aui-chip">Reduce churn</span></div></div>
  <div class="aui-fl__lane fl2"><div class="aui-fl__lane-head"><span class="aui-badge aui-badge--fl2">FL2</span><h3>Coordination</h3><span class="sub">2 streams</span></div>
    <div class="aui-fl__items"><span class="aui-chip">Onboarding revamp</span><span class="aui-chip">Billing v2</span></div></div>
  <div class="aui-fl__lane fl1"><div class="aui-fl__lane-head"><span class="aui-badge aui-badge--fl1">FL1</span><h3>Operational</h3><span class="sub">3 items</span></div>
    <div class="aui-fl__items"><span class="aui-badge aui-badge--on-track">Signup flow</span><span class="aui-badge aui-badge--at-risk">SSO</span><span class="aui-badge aui-badge--blocked">Invoices</span></div></div>
</div>`;

const CHARTS_DEMO = `
<p class="note">Data charts use inlined ECharts (themed via tokens). Sparklines above use the zero-dep SVG micro-lib.</p>
<div class="chart-grid">
  <div><h3 class="sub">Line + area</h3><div id="ch-line" style="height:200px"></div></div>
  <div><h3 class="sub">Stacked area (CFD)</h3><div id="ch-stack" style="height:200px"></div></div>
  <div><h3 class="sub">Bars</h3><div id="ch-bars" style="height:200px"></div></div>
  <div><h3 class="sub">Scatter + percentile lines</h3><div id="ch-scatter" style="height:200px"></div></div>
</div>`;

const DEMO_SCRIPT = [
  "(function () {",
  "  var C = window.AuiCharts;",
  "  var mounted = false;",
  "  function fillTokens() {",
  "    var cs = getComputedStyle(document.documentElement);",
  "    document.querySelectorAll('[data-token]').forEach(function (e) {",
  "      e.textContent = cs.getPropertyValue('--' + e.getAttribute('data-token')).trim();",
  "    });",
  "  }",
  "  function spark(id, vals) { var h = document.getElementById(id); if (h) { h.innerHTML=''; C.sparkline(h, vals, { width: 64, height: 26 }); } }",
  "  function ec(id) { var el = document.getElementById(id); return (el && window.AuiECharts) ? window.AuiECharts.mount(el) : null; }",
  "  function lineChart() {",
  "    var ctl = ec('ch-line'); if (!ctl) return;",
  "    ctl.setOption(function (pal) {",
  "      var d = [4,6,5,8,7,10,9,12,11,14];",
  "      return { grid:{left:4,right:12,top:10,bottom:4,containLabel:true},",
  "        xAxis:{type:'category', boundaryGap:false, data:d.map(function(_,i){return 'd'+i;})},",
  "        yAxis:{type:'value'},",
  "        series:[{type:'line', smooth:true, symbol:'none', areaStyle:{opacity:0.18}, data:d}] };",
  "    });",
  "  }",
  "  function stackChart() {",
  "    var ctl = ec('ch-stack'); if (!ctl) return;",
  "    ctl.setOption(function (pal) {",
  "      var N=10; var x=[]; for (var i=0;i<N;i++) x.push('d'+i);",
  "      function ramp(base){ var a=[]; for (var i=0;i<N;i++) a.push(Math.round(base + base*0.5*(i/(N-1)))); return a; }",
  "      var names=['Done','In Test','In Dev','Backlog']; var bases=[4,3,3,5];",
  "      var series = names.map(function(nm,si){ return {name:nm, type:'line', stack:'cfd', symbol:'none', lineStyle:{width:0}, areaStyle:{opacity:0.92}, emphasis:{focus:'series'}, data:ramp(bases[si])}; });",
  "      return { grid:{left:4,right:12,top:22,bottom:4,containLabel:true}, legend:{}, xAxis:{type:'category', boundaryGap:false, data:x}, yAxis:{type:'value'}, series:series };",
  "    });",
  "  }",
  "  function barsChart() {",
  "    var ctl = ec('ch-bars'); if (!ctl) return;",
  "    ctl.setOption(function (pal) {",
  "      var d=[5,8,6,9,7,11,8,10,12,9,13,7];",
  "      var data=d.map(function(v,i){ return { value:v, itemStyle:{ color: i===d.length-1 ? pal.chart[1] : pal.chart[0] } }; });",
  "      return { grid:{left:4,right:12,top:10,bottom:4,containLabel:true}, xAxis:{type:'category', data:d.map(function(_,i){return 'W'+i;})}, yAxis:{type:'value'},",
  "        series:[{type:'bar', data:data, markLine:{silent:true,symbol:'none',data:[{type:'average',label:{formatter:'avg'}}],lineStyle:{color:pal.muted,type:'dashed'}}}] };",
  "    });",
  "  }",
  "  function scatterChart() {",
  "    var ctl = ec('ch-scatter'); if (!ctl) return;",
  "    ctl.setOption(function (pal) {",
  "      var seed=42; function r(){ seed=(seed*1103515245+12345)&2147483647; return seed/2147483647; }",
  "      var pts=[]; for (var i=0;i<40;i++){ var x=Math.round(r()*30); var y=Math.max(1,Math.round(2+r()*r()*26));",
  "        var c = y>18?pal.blocked:y>11?pal.atRisk:pal.chart[0]; pts.push({value:[x,y], itemStyle:{color:c,opacity:0.82}}); }",
  "      return { grid:{left:4,right:12,top:10,bottom:4,containLabel:true}, xAxis:{type:'value'}, yAxis:{type:'value'},",
  "        series:[{type:'scatter', symbolSize:8, data:pts, markLine:{silent:true,symbol:'none',data:[",
  "          {yAxis:11,lineStyle:{color:pal.atRisk},label:{formatter:'85% 11d',color:pal.atRisk,fontSize:10,position:'insideEndTop'}},",
  "          {yAxis:18,lineStyle:{color:pal.blocked},label:{formatter:'95% 18d',color:pal.blocked,fontSize:10,position:'insideEndTop'}}]}}] };",
  "    });",
  "  }",
  "  function renderAll(){ fillTokens(); spark('sc-spark-1',[14,13,12,11,11,10,9,9]); spark('sc-spark-2',[4,5,5,6,6,7,7,7]); spark('sc-spark-3',[16,15,15,14,14,14,13,14]); if(!mounted){ mounted=true; lineChart(); stackChart(); barsChart(); scatterChart(); } }",
  "  document.addEventListener('DOMContentLoaded', renderAll);",
  "  window.__rerender = fillTokens;",  // ECharts recolors via its own theme observer; SVG via CSS
  "})();",
].join("\n");

export function showcaseHtml(opts: ShowcaseOptions = {}): string {
  const formsSection = opts.formsDemo
    ? `<section id="forms"><h2>Forms &amp; CRUD</h2>${opts.formsDemo}</section>`
    : `<section id="forms"><h2>Forms &amp; CRUD</h2><div class="aui-empty">kit/forms.ts not loaded yet — the CRUD set will appear here automatically once it lands.</div></section>`;

  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Kanban Kit · Component Showcase</title>
<style>
${TOKENS_CSS}
${ATOMS_CSS}
${MOLECULES_CSS}
${opts.formsCss ?? ""}
/* showcase chrome (not part of the kit) */
.sc-top { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; gap: var(--space-4);
  padding: var(--space-3) var(--space-5); background: color-mix(in oklch, var(--background) 88%, transparent);
  backdrop-filter: blur(10px); border-bottom: 1px solid var(--border); }
.sc-top h1 { font-size: var(--text-lg); font-weight: 680; margin-right: auto; letter-spacing: -0.02em; }
.sc-nav { display: flex; flex-wrap: wrap; gap: 4px; }
.sc-nav a { font-size: var(--text-xs); color: var(--muted-foreground); text-decoration: none; padding: 3px 8px; border-radius: var(--radius-sm); }
.sc-nav a:hover { background: var(--accent); color: var(--foreground); }
.sc-wrap { max-width: 1080px; margin: 0 auto; padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-6); }
section { display: flex; flex-direction: column; gap: var(--space-3); scroll-margin-top: 64px; }
section > h2 { font-size: var(--text-lg); font-weight: 650; letter-spacing: -0.01em; padding-bottom: var(--space-2); border-bottom: 1px solid var(--border); }
h3.sub { font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted-foreground); margin-top: var(--space-2); }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.row__cap { flex: 0 0 130px; font-size: var(--text-xs); color: var(--muted-foreground); font-weight: 600; }
.sw-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px,1fr)); gap: var(--space-2); }
.sw { display: flex; align-items: center; gap: var(--space-2); padding: 6px 8px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--card); }
.sw__chip { width: 22px; height: 22px; border-radius: 5px; border: 1px solid var(--border); flex-shrink: 0; }
.sw__name { font-size: var(--text-xs); }
.sw__val { font-size: 0.625rem; color: var(--muted-foreground); margin-left: auto; }
.note { font-size: var(--text-xs); color: var(--muted-foreground); margin-bottom: var(--space-1); }
.chart-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px,1fr)); gap: var(--space-4); }
.chart-grid > div { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: var(--space-3); }
.theme-btn { font-family: inherit; }
</style>
</head>
<body>
<div class="sc-top">
  <h1>Kanban Kit · Showcase</h1>
  <nav class="sc-nav">
    <a href="#tokens">Tokens</a><a href="#badges">Labels</a><a href="#buttons">Buttons</a>
    <a href="#stats">Stats</a><a href="#atoms">Atoms</a><a href="#molecules">Molecules</a>
    <a href="#charts">Charts</a><a href="#forms">Forms</a>
  </nav>
  <div class="aui-segment">
    <button class="aui-segment__btn theme-btn" data-set-theme="dark">Dark</button>
    <button class="aui-segment__btn theme-btn" data-set-theme="light">Light</button>
  </div>
</div>
<div class="sc-wrap">
  <section id="tokens"><h2>Design Tokens</h2><div class="sw-grid">${swatches()}</div></section>
  <section id="badges"><h2>Labels &amp; Badges <span class="aui-badge aui-badge--category">atoms</span></h2>${BADGES}</section>
  <section id="buttons"><h2>Buttons</h2>${BUTTONS}</section>
  <section id="stats"><h2>Stats &amp; KPIs</h2>${STATS}</section>
  <section id="atoms"><h2>Atoms</h2>${MISC_ATOMS}</section>
  <section id="molecules"><h2>Molecules</h2>${MOLECULES_DEMO}</section>
  <section id="charts"><h2>Charts <span class="aui-badge aui-badge--category">SVG, no deps</span></h2>${CHARTS_DEMO}</section>
  ${formsSection}
</div>
<script>${CHARTS_JS}</script>
<script>${ECHARTS_JS}</script>
<script>${ECHARTS_THEME_JS}</script>
<script>${DEMO_SCRIPT}</script>
<script>
(function () {
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem('aui-showcase-theme'); } catch (e) {}
  if (saved) root.setAttribute('data-theme', saved);
  function setActive() {
    var t = root.getAttribute('data-theme');
    document.querySelectorAll('[data-set-theme]').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-set-theme') === t);
    });
  }
  document.querySelectorAll('[data-set-theme]').forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-set-theme');
      root.setAttribute('data-theme', t);
      try { localStorage.setItem('aui-showcase-theme', t); } catch (e) {}
      setActive();
      if (window.__rerender) window.__rerender();
    });
  });
  setActive();
})();
</script>
</body>
</html>`;
}
