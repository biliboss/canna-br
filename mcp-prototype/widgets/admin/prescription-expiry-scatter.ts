/**
 * Scatter de Validade de Prescrições — canna-br compliance control-center widget.
 *
 * Cada bolha = uma prescrição terapêutica ativa de associado. x = data de
 * validade (eixo de tempo), y = cota mensal autorizada (g). O tamanho da bolha
 * é proporcional ao consumo acumulado no mês (consumedG). A cor classifica a
 * zona de renovação: verde (>60d), âmbar (30-60d), vermelho (<30d) — alinhado a
 * ANVISA RDC 1.014/2026 onde a dispensação só é autorizada sob prescrição
 * vigente. markLine vertical em hoje+30d ("Renovar") sinaliza a janela de
 * antecedência que a RT/DIRETORIA usa para acionar renovação.
 *
 * LGPD: associados aparecem como iniciais ("A. S. Oliveira") + sufixo de hash de
 * CPF — NUNCA nome completo nem CPF em claro.
 *
 * ECharts SCATTER (bubble). `build(pal)` BUILDER recomputa toda cor → recolore
 * automaticamente no flip dark/light. Reference: kanban/cycle-time-scatter.ts.
 */
import { htmlShell } from "../../kit/shell.js";
import {
  mulberry32,
  pick,
  sortAsc,
  addDays,
  daysBetween,
  fmtDay,
  ANCHOR,
  type WidgetDef,
} from "../../kit/types.js";

// Iniciais realistas de associados de associação terapêutica BR (LGPD-safe).
const ALIAS_BAG = [
  "A. S. Oliveira", "M. R. Santos", "J. C. Lima", "P. H. Costa",
  "R. F. Almeida", "L. M. Souza", "C. A. Pereira", "F. T. Ribeiro",
  "B. N. Carvalho", "D. P. Rocha", "G. V. Martins", "T. E. Barbosa",
  "I. L. Fernandes", "N. O. Cardoso",
] as const;

const CRM_BAG = [
  "CRM-SP 12345", "CRM-SP 48210", "CRM-RJ 30917", "CRM-MG 22784",
  "CRM-RS 51063", "CRM-SP 19427", "CRM-PR 40835", "CRM-BA 27619",
] as const;

interface Rx {
  memberId: string;
  alias: string;
  physicianCRM: string;
  validUntil: string;
  monthlyQuotaG: number;
  consumedG: number;
  daysToExpiry: number;
  zone: "green" | "amber" | "red";
}

function zoneOf(days: number): Rx["zone"] {
  if (days < 30) return "red";
  if (days <= 60) return "amber";
  return "green";
}

function cpfHash(rng: () => number): string {
  // sufixo de hash de CPF (4 hex) — NUNCA o CPF real.
  const hex = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < 4; i++) s += hex[Math.floor(rng() * 16)];
  return s;
}

function buildData(_args: Record<string, unknown>): Record<string, unknown> {
  const asOf = ANCHOR; // hoje
  const rng = mulberry32(8306);
  const count = 12;

  const used = new Set<string>();
  const items: Rx[] = [];
  for (let i = 0; i < count; i++) {
    // janela de validade: de -10d (vencida/iminente) a +95d à frente de hoje.
    const dte = Math.round(-10 + Math.pow(rng(), 0.85) * 105);
    const validUntil = addDays(asOf, dte);
    const daysToExpiry = daysBetween(asOf, validUntil);

    // alias único + sufixo de hash de CPF (LGPD).
    let alias = pick(rng, ALIAS_BAG);
    let guard = 0;
    while (used.has(alias) && guard++ < 24) alias = pick(rng, ALIAS_BAG);
    used.add(alias);

    const quotaSteps = [30, 45, 60, 75, 90, 105, 120] as const;
    const monthlyQuotaG = pick(rng, quotaSteps);
    // consumo do mês: 35%-98% da cota, arredondado a 1g.
    const consumedG = Math.round(monthlyQuotaG * (0.35 + rng() * 0.63));

    items.push({
      memberId: "MBR-" + (4100 + Math.floor(rng() * 5800)) + "-" + cpfHash(rng),
      alias,
      physicianCRM: pick(rng, CRM_BAG),
      validUntil,
      monthlyQuotaG,
      consumedG,
      daysToExpiry,
      zone: zoneOf(daysToExpiry),
    });
  }
  items.sort((a, b) => a.daysToExpiry - b.daysToExpiry);

  const renewBy = addDays(asOf, 30);
  const consumed = sortAsc(items.map((it) => it.consumedG));
  const counts = {
    red: items.filter((it) => it.zone === "red").length,
    amber: items.filter((it) => it.zone === "amber").length,
    green: items.filter((it) => it.zone === "green").length,
  };
  const maxConsumed = consumed[consumed.length - 1] ?? 1;
  const maxQuota = Math.max(...items.map((it) => it.monthlyQuotaG), 1);

  return {
    asOf,
    renewBy,
    items,
    counts,
    count: items.length,
    maxConsumed,
    maxQuota,
  };
}

function summary(data: Record<string, unknown>): string {
  const c = data.counts as Record<string, number>;
  return (
    `${data.count} prescrições ativas (validade, ref ${data.asOf}): ` +
    `${c.red} vencendo <30 dias, ${c.amber} em 30-60 dias, ${c.green} >60 dias. ` +
    `Renovar até ${data.renewBy} (janela ANVISA RDC 1.014/2026).`
  );
}

const RENDER_JS = `
function render(data) {
  var root = document.getElementById('aui-body');
  var c = data.counts || { red: 0, amber: 0, green: 0 };
  root.innerHTML =
    '<div class="aui-toolbar">' +
      '<span class="aui-field__label">Zona de renovação</span>' +
      '<span class="aui-badge aui-badge--blocked">&lt;30 dias &middot; ' + c.red + '</span>' +
      '<span class="aui-badge aui-badge--at-risk">30-60 dias &middot; ' + c.amber + '</span>' +
      '<span class="aui-badge aui-badge--on-track">&gt;60 dias &middot; ' + c.green + '</span>' +
    '</div>' +
    '<div id="chart" style="width:100%;height:320px"></div>' +
    '<div class="aui-legend" id="legend"></div>';

  var items = data.items || [];
  var maxConsumed = data.maxConsumed || 1;
  var renewTs = ts(data.renewBy);
  function ts(d) { return new Date(d + 'T12:00:00Z').getTime(); }
  function ddmm(d) {
    var x = new Date(d + 'T12:00:00Z');
    return ('0' + x.getUTCDate()).slice(-2) + '/' + ('0' + (x.getUTCMonth() + 1)).slice(-2);
  }
  function pct(c, q) { return q > 0 ? Math.round((c / q) * 100) : 0; }
  // raio da bolha ∝ consumedG (sqrt → área proporcional)
  function size(consumed) {
    return 8 + Math.round(Math.sqrt(consumed / maxConsumed) * 22);
  }

  function build(pal) {
    var colorOf = function (zone) {
      return zone === 'green' ? pal.onTrack : zone === 'amber' ? pal.atRisk : pal.blocked;
    };
    var pts = items.map(function (it) {
      return {
        value: [ts(it.validUntil), it.monthlyQuotaG],
        symbolSize: size(it.consumedG),
        itemStyle: { color: colorOf(it.zone), opacity: 0.78, borderColor: pal.card, borderWidth: 1 },
        _it: it
      };
    });
    var markLine = {
      silent: true, symbol: 'none', animation: false,
      data: [{
        xAxis: renewTs,
        lineStyle: { color: pal.atRisk, type: 'dashed', width: 1.5 },
        label: { formatter: 'Renovar', color: pal.atRisk, fontSize: 10, position: 'insideEndTop' }
      }]
    };
    return {
      grid: { left: 4, right: 20, top: 12, bottom: 4, containLabel: true },
      xAxis: {
        type: 'time', name: 'validade', nameLocation: 'end',
        nameTextStyle: { color: pal.muted, fontSize: 10 },
        axisLabel: { formatter: function (v) { var d = new Date(v); return (d.getUTCMonth() + 1) + '/' + d.getUTCDate(); } }
      },
      yAxis: {
        type: 'value', name: 'cota mensal (g)', nameLocation: 'end',
        nameTextStyle: { color: pal.muted, fontSize: 10, align: 'left' },
        min: 0, max: Math.ceil((data.maxQuota || 120) * 1.12)
      },
      tooltip: {
        trigger: 'item',
        formatter: function (pm) {
          var it = pm.data && pm.data._it; if (!it) return '';
          var p = pct(it.consumedG, it.monthlyQuotaG);
          return '<b>' + it.alias + '</b><br/>' +
            '<span style="opacity:.65">' + it.physicianCRM + '</span><br/>' +
            '<span style="opacity:.65">Vence</span> <b>' + ddmm(it.validUntil) + '</b>' +
            ' <span style="opacity:.65">(' + it.daysToExpiry + 'd)</span><br/>' +
            '<span style="opacity:.65">cota</span> <b>' + it.monthlyQuotaG + 'g</b> &middot; ' +
            '<span style="opacity:.65">consumido</span> <b>' + it.consumedG + 'g</b> (' + p + '%)';
        }
      },
      series: [{
        type: 'scatter', data: pts, emphasis: { scale: 1.25 },
        markLine: markLine
      }]
    };
  }

  if (window.__rxScatterCtl) { try { window.__rxScatterCtl.dispose(); } catch (e) {} }
  var ctl = AuiECharts.mount(document.getElementById('chart'));
  window.__rxScatterCtl = ctl;
  ctl.setOption(build);

  var legend = document.getElementById('legend');
  [['var(--on-track)', '&gt;60 dias (vigente)'],
   ['var(--at-risk)', '30-60 dias (renovar)'],
   ['var(--blocked)', '&lt;30 dias (crítico)']]
    .forEach(function (g) {
      var s = document.createElement('span');
      s.className = 'aui-legend__item';
      s.innerHTML = '<span class="aui-legend__swatch" style="background:' + g[0] + '"></span>' + g[1];
      legend.appendChild(s);
    });
  var note = document.createElement('span');
  note.className = 'aui-legend__item';
  note.innerHTML = '<span style="opacity:.6">tamanho da bolha &prop; consumo no mês (g)</span>';
  legend.appendChild(note);
}
`;

function html(data: Record<string, unknown>): string {
  return htmlShell({
    title: "Validade de Prescrições",
    categoryLabel: "Compliance",
    subtitle:
      "Bolha por prescrição ativa · x = validade · y = cota mensal (g) · tamanho ∝ consumo · linha Renovar em hoje+30d (ANVISA RDC 1.014/2026)",
    data,
    bodyHtml: `<div id="chart" style="width:100%;height:320px"></div>`,
    renderJs: RENDER_JS,
    echarts: true,
    wide: true,
  });
}

export const def: WidgetDef = {
  name: "canna_prescription_scatter",
  title: "Validade de Prescrições",
  description:
    "Scatter de validade de prescrições terapêuticas (ANVISA RDC 1.014/2026): cada bolha é uma prescrição ativa de associado plotada por data de validade (x) e cota mensal autorizada em gramas (y); o tamanho da bolha é proporcional ao consumo acumulado no mês. A cor classifica a zona de renovação — verde >60 dias (vigente), âmbar 30-60 dias (renovar), vermelho <30 dias (crítico). Linha vertical 'Renovar' em hoje+30d marca a janela de antecedência da RT/DIRETORIA. Tooltip traz iniciais do associado (LGPD), CRM do prescritor, data de vencimento, cota e consumo. Renderizado com ECharts. Dados sintéticos determinísticos.",
  category: "compliance",
  inputShape: {},
  resourceUri: "ui://canna/prescription-expiry-scatter",
  resourceName: "prescription-expiry-scatter",
  version: "0.1.0",
  status: "experimental",
  added: "2026-06-10",
  buildData,
  summary,
  html,
  meta: { prefersBorder: true, csp: { connectDomains: ["self"] } },
};
