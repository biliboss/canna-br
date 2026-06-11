/**
 * Dispensation Throughput — 12-week stacked bar by lot origin + rolling-4wk line.
 *
 * canna-br admin control-center widget (ANVISA RDC 1.014/2026). Surfaces weekly
 * dispensação throughput for a therapeutic cannabis association, stacked by the
 * origin of the dispensed lote (Lote → Dispensação spine): Cultivo Próprio
 * (internal cultivation), Compra Externa (external purchase), and Doação
 * (donation). A rolling 4-week average line tracks total throughput so the
 * DIRETORIA / RT can read trend at a glance. ECharts stacked bar + line overlay.
 *
 * LGPD: this is an aggregate operational view — no member identifiers surface
 * here at all (counts only). Reference kit widget: kanban/throughput.ts.
 */
import { htmlShell } from "../../kit/shell.js";
import {
  mulberry32,
  randInt,
  round1,
  mean,
  type WidgetDef,
} from "../../kit/types.js";

interface WeekBucket {
  /** ISO week label "2026-W15" .. "2026-W26" */
  week: string;
  /** dispensações from internally cultivated lotes */
  internal: number;
  /** dispensações from externally purchased lotes */
  external: number;
  /** dispensações from donated lotes */
  donation: number;
  /** internal + external + donation */
  total: number;
  /** trailing 4-week average of total (null until 4 weeks of history) */
  rollingAvg: number | null;
}

const WEEKS = [
  "2026-W15", "2026-W16", "2026-W17", "2026-W18", "2026-W19", "2026-W20",
  "2026-W21", "2026-W22", "2026-W23", "2026-W24", "2026-W25", "2026-W26",
];

function buildData(_args: Record<string, unknown>): Record<string, unknown> {
  const rng = mulberry32(8303);

  const buckets: WeekBucket[] = [];
  const totals: number[] = [];

  for (let i = 0; i < WEEKS.length; i++) {
    const internal = randInt(rng, 8, 13);
    const external = randInt(rng, 2, 5);
    const donation = randInt(rng, 0, 1);
    const total = internal + external + donation;
    totals.push(total);

    let rollingAvg: number | null = null;
    if (i >= 3) {
      const window = totals.slice(i - 3, i + 1);
      rollingAvg = round1(mean(window));
    }

    buckets.push({
      week: WEEKS[i]!,
      internal,
      external,
      donation,
      total,
      rollingAvg,
    });
  }

  const sumInternal = buckets.reduce((s, b) => s + b.internal, 0);
  const sumExternal = buckets.reduce((s, b) => s + b.external, 0);
  const sumDonation = buckets.reduce((s, b) => s + b.donation, 0);
  const grandTotal = sumInternal + sumExternal + sumDonation;
  const avgPerWeek = round1(mean(totals));
  const lastWeekTotal = totals[totals.length - 1]!;

  return {
    weeks: WEEKS,
    buckets,
    sumInternal,
    sumExternal,
    sumDonation,
    grandTotal,
    avgPerWeek,
    lastWeekTotal,
    windowLabel: `${WEEKS[0]}–${WEEKS[WEEKS.length - 1]}`,
  };
}

function summary(data: Record<string, unknown>): string {
  return (
    `Throughput de dispensações em ${(data.weeks as string[]).length} semanas ` +
    `(${data.windowLabel}): ${data.grandTotal} dispensações no total ` +
    `(${data.sumInternal} cultivo próprio · ${data.sumExternal} compra externa · ` +
    `${data.sumDonation} doação). Média ${data.avgPerWeek}/sem, ` +
    `última semana ${data.lastWeekTotal}.`
  );
}

const RENDER_JS = `
function render(data) {
  var root = document.getElementById('aui-body');
  if (window.__cannaDispThroughputCtl) {
    try { window.__cannaDispThroughputCtl.dispose(); } catch (e) {}
    window.__cannaDispThroughputCtl = null;
  }
  root.innerHTML =
    '<div class="aui-kpis" id="kpis"></div>' +
    '<div id="chart" style="width:100%;height:300px"></div>' +
    '<div class="aui-legend" id="legend"></div>';

  var buckets = data.buckets || [];
  var weeks = data.weeks || [];
  var N = buckets.length;

  // ── KPI strip ──────────────────────────────────────────────────────────────
  var grid = document.getElementById('kpis');
  var kpis = [
    { label: 'Total 12 sem', value: (data.grandTotal != null ? data.grandTotal : 0), unit: '' },
    { label: 'Média / sem', value: (data.avgPerWeek != null ? data.avgPerWeek : 0), unit: '/sem' },
    { label: 'Cultivo próprio', value: (data.sumInternal != null ? data.sumInternal : 0), unit: '' },
    { label: 'Última semana', value: (data.lastWeekTotal != null ? data.lastWeekTotal : 0), unit: '' }
  ];
  kpis.forEach(function (k) {
    var cell = document.createElement('div');
    cell.className = 'aui-statcard';
    var stat = document.createElement('div');
    stat.className = 'aui-stat';
    stat.innerHTML =
      '<span class="aui-stat__label">' + k.label + '</span>' +
      '<span><span class="aui-stat__value">' + k.value + '</span>' +
      (k.unit ? '<span class="aui-stat__unit">' + k.unit + '</span>' : '') +
      '</span>';
    cell.appendChild(stat);
    grid.appendChild(cell);
  });

  if (!N) {
    document.getElementById('chart').innerHTML =
      '<div class="aui-empty">Sem dados de dispensação</div>';
    return;
  }

  // ── ECharts option builder (recolors on theme flip) ──────────────────────────
  var internal = buckets.map(function (b) { return b.internal; });
  var external = buckets.map(function (b) { return b.external; });
  var donation = buckets.map(function (b) { return b.donation; });
  var rolling = buckets.map(function (b) { return (b.rollingAvg != null) ? b.rollingAvg : null; });

  function build(pal) {
    return {
      grid: { left: 4, right: 14, top: 14, bottom: 4, containLabel: true },
      legend: { show: true, top: 0, data: ['Cultivo Próprio', 'Compra Externa', 'Doação', 'Média 4 sem'] },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: function (rows) {
          if (!rows || !rows.length) return '';
          var idx = rows[0].dataIndex;
          var b = buckets[idx] || {};
          var avgRow = (b.rollingAvg != null)
            ? '<br/><span style="opacity:.65">média 4 sem</span> <b>' + b.rollingAvg + '</b>'
            : '';
          return '<b>' + (b.week || '') + '</b>' +
            '<br/><span style="opacity:.65">cultivo próprio</span> <b>' + (b.internal != null ? b.internal : 0) + '</b>' +
            '<br/><span style="opacity:.65">compra externa</span> <b>' + (b.external != null ? b.external : 0) + '</b>' +
            '<br/><span style="opacity:.65">doação</span> <b>' + (b.donation != null ? b.donation : 0) + '</b>' +
            '<br/><span style="opacity:.65">total</span> <b>' + (b.total != null ? b.total : 0) + '</b>' +
            avgRow;
        }
      },
      xAxis: {
        type: 'category',
        data: weeks,
        axisLabel: {
          interval: function (i) { return i === 0 || i === N - 1 || i % 2 === 0; },
          formatter: function (v) { return String(v).replace('2026-', ''); }
        }
      },
      yAxis: {
        type: 'value',
        name: 'dispensações / sem',
        nameLocation: 'end',
        nameTextStyle: { color: pal.muted, fontSize: 10, align: 'left' },
        min: 0
      },
      series: [
        {
          type: 'bar',
          name: 'Cultivo Próprio',
          stack: 'origem',
          data: internal,
          barMaxWidth: 30,
          color: pal.chart[0],
          itemStyle: { color: pal.chart[0] }
        },
        {
          type: 'bar',
          name: 'Compra Externa',
          stack: 'origem',
          data: external,
          barMaxWidth: 30,
          color: pal.chart[1],
          itemStyle: { color: pal.chart[1] }
        },
        {
          type: 'bar',
          name: 'Doação',
          stack: 'origem',
          data: donation,
          barMaxWidth: 30,
          color: pal.chart[2],
          itemStyle: { color: pal.chart[2], borderRadius: [3, 3, 0, 0] }
        },
        {
          type: 'line',
          name: 'Média 4 sem',
          data: rolling,
          smooth: true,
          connectNulls: true,
          symbol: 'circle',
          symbolSize: 5,
          color: pal.muted,
          lineStyle: { color: pal.muted, width: 2, type: 'dashed' },
          itemStyle: { color: pal.muted }
        }
      ]
    };
  }

  var ctl = AuiECharts.mount(document.getElementById('chart'));
  window.__cannaDispThroughputCtl = ctl;
  ctl.setOption(build);

  // ── legend ───────────────────────────────────────────────────────────────────
  var legend = document.getElementById('legend');
  legend.innerHTML =
    '<span class="aui-legend__item">' +
      '<span class="aui-legend__swatch" style="background:var(--chart-1)"></span>Cultivo Próprio</span>' +
    '<span class="aui-legend__item">' +
      '<span class="aui-legend__swatch" style="background:var(--chart-2)"></span>Compra Externa</span>' +
    '<span class="aui-legend__item">' +
      '<span class="aui-legend__swatch" style="background:var(--chart-3)"></span>Doação</span>' +
    '<span class="aui-legend__item">' +
      '<span class="aui-legend__swatch" style="background:var(--muted-foreground)"></span>Média 4 sem</span>';
}
`;

function html(data: Record<string, unknown>): string {
  return htmlShell({
    title: "Throughput de Dispensações",
    categoryLabel: "Operations",
    subtitle: `Dispensações por origem do lote · 12 semanas · ${data.windowLabel}`,
    data,
    bodyHtml: `<div class="aui-kpis" id="kpis"></div><div id="chart" style="width:100%;height:300px"></div><div class="aui-legend" id="legend"></div>`,
    renderJs: RENDER_JS,
    echarts: true,
    wide: true,
  });
}

export const def: WidgetDef = {
  name: "canna_dispensation_throughput",
  title: "Throughput de Dispensações",
  description:
    "Throughput de dispensações de uma associação terapêutica de cannabis (ANVISA RDC 1.014/2026) ao longo de 12 semanas, em barras empilhadas por origem do lote — Cultivo Próprio, Compra Externa e Doação — com linha de média móvel de 4 semanas sobre o total. Visão agregada para DIRETORIA / Responsável Técnico; sem identificadores de associado (LGPD). Dados sintéticos determinísticos quando argumentos ausentes.",
  category: "operations",
  inputShape: {},
  resourceUri: "ui://canna/dispensation-throughput-bar",
  resourceName: "dispensation-throughput-bar",
  version: "0.1.0",
  status: "experimental",
  added: "2026-06-10",
  buildData,
  summary,
  html,
  meta: { prefersBorder: true, csp: { connectDomains: ["self"] } },
};
