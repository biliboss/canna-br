/**
 * Quota Consumption Scorecard — control-center de cotas mensais para a diretoria /
 * RT de uma associação terapêutica de cannabis (ANVISA RDC 1.014/2026).
 *
 * Cinco KPIs num único relance, cada um com um sparkline de ~12 meses e delta:
 *   - Associados Ativos
 *   - Dispensado (g/mês)
 *   - % Quota Média Utilizada      (cair é BOM — menos pressão de cota)
 *   - Membros >80% da Quota        (subir é RUIM — risco de estouro / SNGPC)
 *   - Pendentes de Aprovação       (subir é RUIM — fila de prescrição parada)
 *
 * LGPD: nenhum nome completo / CPF — só iniciais + sufixo de hash de CPF.
 * Reference widget: kanban/flow-scorecard.ts (atoms/molecules path, sem ECharts).
 */
import { htmlShell } from "../../kit/shell.js";
import { mulberry32, type WidgetDef } from "../../kit/types.js";

interface QuotaCard {
  key: string;
  label: string;
  value: string;
  unit: string;
  trend: number[];
  deltaPct: number;
  /** quando o indicador melhora ao cair (ex.: % de quota utilizada, fila) */
  goodWhenDown: boolean;
}

function buildData(_args: Record<string, unknown>): Record<string, unknown> {
  const competencia = "2026-06";
  const rng = mulberry32(8302);

  // série de ~12 competências; drift = tendência mensal, jitter = ruído mês-a-mês
  function trend(base: number, jitter: number, drift: number): number[] {
    const out: number[] = [];
    let v = base - drift * 11;
    for (let i = 0; i < 12; i++) {
      v += drift + (rng() - 0.5) * jitter;
      out.push(Math.max(0, Math.round(v * 10) / 10));
    }
    return out;
  }

  // Sparkline values são apenas a forma da tendência; os números de capa do
  // scorecard são fixos (espelham o estado declarado da associação em jun/2026).
  const associados = trend(47, 2.4, 0.4); // +3 no acumulado da janela
  const dispensado = trend(1840, 90, 22); // +12.3% acumulado, em gramas/mês
  const quotaUtil = trend(61, 3.5, -1.0); // -4 acumulado (queda = bom)
  const acima80 = trend(9, 1.6, 0.35); // +2 acumulado (subida = ruim)
  const pendentes = trend(3, 1.2, 0.18); // +1 acumulado (subida = ruim)

  const cards: QuotaCard[] = [
    {
      key: "associados",
      label: "Associados Ativos",
      value: "47",
      unit: "membros",
      trend: associados,
      deltaPct: 3,
      goodWhenDown: false,
    },
    {
      key: "dispensado",
      label: "Dispensado no Mês",
      value: "1840.5",
      unit: "g",
      trend: dispensado,
      deltaPct: 12,
      goodWhenDown: false,
    },
    {
      key: "quotaUtil",
      label: "Quota Média Utilizada",
      value: "61",
      unit: "%",
      trend: quotaUtil,
      deltaPct: -4,
      goodWhenDown: true,
    },
    {
      key: "acima80",
      label: "Membros >80% da Quota",
      value: "9",
      unit: "membros",
      trend: acima80,
      deltaPct: 2,
      goodWhenDown: true,
    },
    {
      key: "pendentes",
      label: "Pendentes de Aprovação",
      value: "3",
      unit: "prescrições",
      trend: pendentes,
      deltaPct: 1,
      goodWhenDown: true,
    },
  ];

  // Destaques de membros em risco de estouro de cota — LGPD-safe:
  // iniciais + sufixo de hash de CPF, SKU (forma farmacêutica) e % de quota.
  const watchlist = [
    { member: "A. S. Oliveira", cpfHash: "·a91f", sku: "CBD-ISO-30-001", grams: 26.4, quotaPct: 94 },
    { member: "M. R. Costa", cpfHash: "·7e2c", sku: "CBD-FS-50-014", grams: 41.0, quotaPct: 91 },
    { member: "J. P. Almeida", cpfHash: "·c4d8", sku: "THC-CBD-12-003", grams: 18.7, quotaPct: 88 },
    { member: "L. F. Souza", cpfHash: "·1b60", sku: "CBD-BS-20-022", grams: 22.1, quotaPct: 85 },
    { member: "R. T. Nunes", cpfHash: "·9af3", sku: "CBD-ISO-30-001", grams: 30.0, quotaPct: 82 },
  ];

  return { competencia, cards, watchlist };
}

function summary(data: Record<string, unknown>): string {
  const cards = data.cards as QuotaCard[];
  const by = (k: string) => cards.find((c) => c.key === k)?.value;
  const wl = (data.watchlist as { quotaPct: number }[]) || [];
  return (
    `Cotas mensais (competência ${data.competencia}): ` +
    `${by("associados")} associados ativos, ` +
    `${by("dispensado")} g dispensados no mês, ` +
    `quota média utilizada ${by("quotaUtil")}%, ` +
    `${by("acima80")} membros acima de 80% da cota, ` +
    `${by("pendentes")} prescrições pendentes de aprovação. ` +
    `Watchlist de estouro: ${wl.length} membros >=82% (LGPD: iniciais + hash de CPF).`
  );
}

const RENDER_JS = `
function render(data) {
  var root = document.getElementById('aui-body');
  root.innerHTML = '';

  var grid = document.createElement('div');
  grid.className = 'aui-kpis';
  grid.id = 'kpis';
  root.appendChild(grid);

  (data.cards || []).forEach(function (c) {
    var up = c.deltaPct > 0, down = c.deltaPct < 0;
    // 'good' = o movimento é favorável para este indicador.
    var good = up ? !c.goodWhenDown : down ? c.goodWhenDown : true;
    // coloração: verde (--up) quando bom, vermelho (--down) quando ruim,
    // independentemente da direção literal da seta.
    var dirCls = good ? 'aui-stat--up' : 'aui-stat--down';
    if (!up && !down) dirCls = '';
    var arrow = up ? '\\u2191' : down ? '\\u2193' : '\\u2192';

    var cell = document.createElement('div');
    cell.className = 'aui-statcard';
    var row = document.createElement('div');
    row.className = 'aui-statcard__row';

    var stat = document.createElement('div');
    stat.className = 'aui-stat ' + dirCls;
    stat.innerHTML =
      '<span class="aui-stat__label">' + c.label + '</span>' +
      '<span><span class="aui-stat__value">' + c.value + '</span>' +
      '<span class="aui-stat__unit">' + c.unit + '</span></span>' +
      '<span class="aui-stat__delta">' + arrow + ' ' + Math.abs(c.deltaPct) + (c.unit === '%' ? ' p.p.' : '%') + '</span>';
    row.appendChild(stat);

    var sparkHost = document.createElement('div');
    sparkHost.className = 'aui-statcard__spark';
    row.appendChild(sparkHost);
    cell.appendChild(row);
    grid.appendChild(cell);
    AuiCharts.sparkline(sparkHost, c.trend, { width: 72, height: 28 });
  });

  // Watchlist de membros em risco de estouro de cota (LGPD-safe).
  var wl = data.watchlist || [];
  if (wl.length) {
    var card = document.createElement('div');
    card.className = 'aui-card';
    card.style.marginTop = '16px';

    var head = document.createElement('div');
    head.className = 'aui-statcard__row';
    head.style.marginBottom = '8px';
    head.innerHTML =
      '<span class="aui-stat__label">Watchlist — Risco de Estouro de Cota</span>' +
      '<span class="aui-badge aui-badge--at-risk">' + wl.length + ' em alerta</span>';
    card.appendChild(head);

    wl.forEach(function (m) {
      var sev = m.quotaPct >= 90 ? 'aui-badge--blocked'
        : m.quotaPct >= 85 ? 'aui-badge--at-risk'
        : 'aui-badge--aging';
      var sevLabel = m.quotaPct >= 90 ? 'crítico'
        : m.quotaPct >= 85 ? 'atenção'
        : 'observar';

      var rowEl = document.createElement('div');
      rowEl.className = 'aui-cardlet';
      rowEl.style.display = 'flex';
      rowEl.style.alignItems = 'center';
      rowEl.style.justifyContent = 'space-between';
      rowEl.style.gap = '10px';

      var left = document.createElement('div');
      left.className = 'aui-cardlet__title';
      left.textContent = m.member;
      var hashEl = document.createElement('span');
      hashEl.className = 'aui-stat__unit';
      hashEl.textContent = m.cpfHash;
      left.appendChild(hashEl);

      var mid = document.createElement('div');
      mid.className = 'aui-cardlet__meta';
      mid.textContent = m.sku + ' · ' + m.grams.toFixed(1) + ' g';

      var rightWrap = document.createElement('div');
      rightWrap.style.display = 'flex';
      rightWrap.style.alignItems = 'center';
      rightWrap.style.gap = '8px';
      var pct = document.createElement('span');
      pct.className = 'aui-stat__delta';
      pct.textContent = m.quotaPct + '%';
      var badge = document.createElement('span');
      badge.className = 'aui-badge ' + sev;
      badge.textContent = sevLabel;
      rightWrap.appendChild(pct);
      rightWrap.appendChild(badge);

      rowEl.appendChild(left);
      rowEl.appendChild(mid);
      rowEl.appendChild(rightWrap);
      card.appendChild(rowEl);
    });

    root.appendChild(card);
  }
}
`;

function html(data: Record<string, unknown>): string {
  return htmlShell({
    title: "Scorecard de Cotas Mensais",
    categoryLabel: "Membership",
    subtitle: `Consumo de cotas · competência ${data.competencia} · ANVISA RDC 1.014/2026`,
    data,
    bodyHtml: `<div class="aui-kpis" id="kpis"></div>`,
    renderJs: RENDER_JS,
    wide: true,
  });
}

export const def: WidgetDef = {
  name: "canna_quota_scorecard",
  title: "Scorecard de Cotas Mensais",
  description:
    "Control-center de cotas mensais da associação terapêutica: associados ativos, gramas dispensadas no mês, quota média utilizada, membros acima de 80% da cota e prescrições pendentes — cada KPI com tendência de 12 competências, mais uma watchlist LGPD-safe (iniciais + hash de CPF) de membros em risco de estouro de cota. Dados sintéticos determinísticos quando sem argumentos.",
  category: "membership",
  inputShape: {},
  resourceUri: "ui://canna/quota-consumption-scorecard",
  resourceName: "quota-consumption-scorecard",
  version: "0.1.0",
  status: "experimental",
  added: "2026-06-10",
  buildData,
  summary,
  html,
  meta: { prefersBorder: true, csp: { connectDomains: ["self"] } },
};
