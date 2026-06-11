/**
 * ECharts integration for the kit.
 *
 *   ECHARTS_JS       — the tree-shaken bundle (sets window.echarts). Rebuild with
 *                      `pnpm run build:echarts`.
 *   ECHARTS_THEME_JS — window.AuiECharts: token→theme bridge + mount() controller
 *                      that auto-recolors on dark/light flip and reports size to
 *                      the host. Widgets call AuiECharts.mount(el).setOption(opt).
 *
 * Inlined (not CDN) because the MCP-App sandbox does not expose a controllable
 * script-src; inline scripts are permitted (allow-scripts).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const ECHARTS_JS: string = readFileSync(
  fileURLToPath(new URL("./echarts/echarts.bundle.js", import.meta.url)),
  "utf8",
);

export const ECHARTS_THEME_JS = `(function () {
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function palette() {
    return {
      chart: [cssVar('--chart-1'),cssVar('--chart-2'),cssVar('--chart-3'),cssVar('--chart-4'),cssVar('--chart-5'),cssVar('--chart-6'),cssVar('--chart-7'),cssVar('--chart-8')],
      fg: cssVar('--foreground'),
      muted: cssVar('--muted-foreground'),
      border: cssVar('--border'),
      card: cssVar('--card'),
      bg: cssVar('--background'),
      onTrack: cssVar('--on-track'),
      atRisk: cssVar('--at-risk'),
      aging: cssVar('--aging'),
      blocked: cssVar('--blocked'),
      done: cssVar('--done'),
      font: cssVar('--font-sans') || 'system-ui, sans-serif'
    };
  }
  function baseOption(p) {
    return {
      color: p.chart,
      textStyle: { color: p.fg, fontFamily: p.font, fontSize: 12 },
      animationDuration: 320,
      grid: { left: 8, right: 14, top: 18, bottom: 8, containLabel: true },
      legend: { textStyle: { color: p.muted, fontSize: 11 }, inactiveColor: p.border, icon: 'roundRect', itemWidth: 11, itemHeight: 11, top: 0 },
      tooltip: {
        backgroundColor: p.card,
        borderColor: p.border,
        borderWidth: 1,
        textStyle: { color: p.fg, fontSize: 12 },
        extraCssText: 'border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.4);padding:8px 12px;',
        axisPointer: { type: 'line', lineStyle: { color: p.muted, type: 'dashed', width: 1 } }
      },
      xAxis: {
        axisLine: { lineStyle: { color: p.border } },
        axisTick: { lineStyle: { color: p.border } },
        axisLabel: { color: p.muted, fontSize: 10, hideOverlap: true },
        splitLine: { show: false }
      },
      yAxis: {
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: p.muted, fontSize: 10 },
        splitLine: { lineStyle: { color: p.border, type: 'dashed', opacity: 0.5 } }
      }
    };
  }
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function merge(base, over) {
    if (!isObj(base)) return over;
    var out = {}; var k;
    for (k in base) out[k] = base[k];
    for (k in over) { out[k] = (isObj(out[k]) && isObj(over[k])) ? merge(out[k], over[k]) : over[k]; }
    return out;
  }

  function mount(el, opts) {
    opts = opts || {};
    var chart = window.echarts.init(el, null, { renderer: 'canvas' });
    var lastUser = null;
    function apply() {
      if (lastUser == null) return;
      var pal = palette();
      // builder form recomputes every color on theme flip; object form is static
      var opt = (typeof lastUser === 'function') ? lastUser(pal) : lastUser;
      chart.setOption(merge(baseOption(pal), opt), { notMerge: true });
    }
    function setOption(userOpt) { lastUser = userOpt; apply(); ping(); }
    function ping() { try { if (window.AuiBridge) AuiBridge.notifySize(); } catch (e) {} }

    var ro = window.ResizeObserver ? new ResizeObserver(function () { chart.resize(); ping(); }) : null;
    if (ro) ro.observe(el);
    window.addEventListener('resize', function () { chart.resize(); });

    // recolor on dark/light flip without losing data
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        if (muts[i].attributeName === 'data-theme') { apply(); break; }
      }
    });
    mo.observe(document.documentElement, { attributes: true });

    return {
      chart: chart,
      setOption: setOption,
      resize: function () { chart.resize(); },
      palette: palette,
      dispose: function () { if (ro) ro.disconnect(); mo.disconnect(); chart.dispose(); }
    };
  }

  window.AuiECharts = { mount: mount, palette: palette, cssVar: cssVar, baseOption: baseOption };
})();`;
