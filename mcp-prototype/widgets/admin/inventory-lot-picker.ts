/**
 * Seletor de Lotes (FIFO) — inventory-lot-picker (canna-br admin control-center).
 *
 * A focused picker over the AVAILABLE (status=RELEASED) cannabis-extract lots,
 * sorted strictly FIFO (oldest expiry first) so dispensation always pulls the
 * lot closest to vencimento. Each row is a selectable card carrying the lot id,
 * strain/product, remaining grams, expiry date, days-to-expiry and an urgency
 * badge (vencido / vencimento crítico <7d / vence <30d). One row is selectable
 * at a time; choosing it fires a "select for dispensation" affordance that asks
 * the assistant to draft a dispensation against that lot. Built for the
 * dispensation workflow (RT / DIRETORIA).
 *
 * Read-model NOT ready (list-available-lots is a v0.2.1 stub returning {lots:[]});
 * data here is deterministic synthetic (mulberry32) purely so the gallery card is
 * visible for review. Live tool-result re-fires render() with real lots later.
 *
 * LGPD: lots carry no member PII — only lot id, SKU/strain, grams, dates, COA.
 *
 * Compose: kit atoms (.aui-card, .aui-badge, .aui-chip, .aui-btn, .aui-progress,
 * .aui-empty) + tokens only. No hand-rolled HTML strings outside htmlShell.
 */
import { htmlShell } from "../../kit/shell.js";
import { mulberry32, randInt, pick, addDays, daysBetween, ANCHOR, type WidgetDef } from "../../kit/types.js";

interface Lot {
  id: string;
  sku: string;
  strain: string;
  currentQuantityG: number;
  expiryDate: string;
  daysToExpiry: number;
  status: "RELEASED";
  coaRef: string;
}

// Strain / product names paired with a cannabinoid·form SKU base.
const STRAINS: { strain: string; base: string }[] = [
  { strain: "Charlotte's Web", base: "CBD-FULL-50" },
  { strain: "ACDC", base: "CBD-BROAD-20" },
  { strain: "Harlequin", base: "CBD-CBG-15" },
  { strain: "Cannatonic", base: "CBD-ISO-30" },
  { strain: "Ringo's Gift", base: "CBD-ISO-100" },
  { strain: "Remedy", base: "CBD-CBN-10" },
  { strain: "Suzy Q", base: "CBD-RICK-200" },
  { strain: "Sour Tsunami", base: "CBD-FULL-50" },
];

const COA_LABS = ["EUROFINS", "BIOAGRI", "MERIEUX", "SGS"];

function buildData(args: Record<string, unknown>): Record<string, unknown> {
  const asOf = typeof args.as_of === "string" ? args.as_of : ANCHOR;
  const rng = mulberry32(7714);

  // 5–8 RELEASED lots; a couple deliberately near (or past) expiry so the FIFO
  // ordering + urgency badges are exercised in the gallery preview.
  const count = randInt(rng, 5, 8);

  // expiry offsets (days from asOf): seed a near-expiry cluster + a healthy tail.
  const nearWindow = [-3, 2, 5, 9]; // vencido / crítico / sub-30d band
  const lots: Lot[] = [];
  const usedStrains = new Set<number>();
  for (let i = 0; i < count; i++) {
    // pick a distinct strain when possible (stable across runs via rng)
    let si = randInt(rng, 0, STRAINS.length - 1);
    let guard = 0;
    while (usedStrains.has(si) && guard < STRAINS.length) {
      si = (si + 1) % STRAINS.length;
      guard++;
    }
    usedStrains.add(si);
    const s = STRAINS[si]!;

    const seq = String(randInt(rng, 1, 48)).padStart(3, "0");
    const sku = s.base + "-" + seq;

    // First two lots sit in the near-expiry window; the rest spread 40–420 days out.
    let expiryOffset: number;
    if (i < 2) expiryOffset = nearWindow[i] ?? randInt(rng, -3, 9);
    else expiryOffset = randInt(rng, 40, 420);
    const expiryDate = addDays(asOf, expiryOffset);
    const daysToExpiry = daysBetween(asOf, expiryDate);

    const currentQuantityG = pick(rng, [8, 12.5, 18, 24, 30, 45, 60, 90]);
    const coaRef = pick(rng, COA_LABS) + "-" + String(randInt(rng, 10000, 99999));

    lots.push({
      id: "LOTE-" + String(2500 + i),
      sku,
      strain: s.strain,
      currentQuantityG,
      expiryDate,
      daysToExpiry,
      status: "RELEASED",
      coaRef,
    });
  }

  // FIFO: oldest expiry first (smallest daysToExpiry → front of the queue).
  lots.sort((a, b) => a.daysToExpiry - b.daysToExpiry);

  const totalAvailableG = Math.round(lots.reduce((s, l) => s + l.currentQuantityG, 0) * 10) / 10;
  const criticalCount = lots.filter((l) => l.daysToExpiry < 7).length;
  const fifoLotId = lots.length > 0 ? lots[0]!.id : null;

  return {
    asOf,
    lots,
    total: lots.length,
    totalAvailableG,
    criticalCount,
    fifoLotId,
  };
}

function summary(data: Record<string, unknown>): string {
  const lots = (data.lots as Lot[]) ?? [];
  const total = data.total as number;
  const fifo = lots[0];
  if (total === 0) {
    return `Seletor de Lotes (FIFO) em ${data.asOf}: nenhum lote liberado (RELEASED) disponível para dispensação.`;
  }
  return (
    `Seletor de Lotes (FIFO) em ${data.asOf}: ${total} lote(s) liberado(s), ` +
    `${data.totalAvailableG}g disponíveis, ${data.criticalCount} com vencimento crítico (<7d). ` +
    `Próximo lote pela regra FIFO: ${fifo?.id} (${fifo?.strain}, vence ${fifo?.expiryDate}). ` +
    `Selecione um lote para iniciar a dispensação.`
  );
}

const RENDER_JS = `
function render(data) {
  var root = document.getElementById('aui-body');
  root.innerHTML = '';

  var lots = (data && data.lots) || [];

  // ── empty state ──
  if (!lots.length) {
    var empty = document.createElement('div');
    empty.className = 'aui-empty';
    empty.style.padding = 'var(--space-4)';
    empty.textContent = 'Nenhum lote liberado disponível';
    root.appendChild(empty);
    return;
  }

  function fmtBR(iso) {
    var p = String(iso).split('-');
    return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : iso;
  }

  var list = document.createElement('div');
  list.className = 'aui-card';
  list.style.display = 'flex';
  list.style.flexDirection = 'column';
  list.style.gap = 'var(--space-2)';
  list.style.padding = 'var(--space-3)';

  var selectedId = null;
  var rows = [];

  function clearSelection() {
    rows.forEach(function (r) {
      r.style.borderColor = 'var(--border)';
      r.style.boxShadow = 'none';
      r.setAttribute('aria-selected', 'false');
    });
  }

  lots.forEach(function (l, idx) {
    var rowEl = document.createElement('div');
    rowEl.className = 'aui-cardlet';
    rowEl.style.cursor = 'pointer';
    rowEl.style.display = 'flex';
    rowEl.style.alignItems = 'center';
    rowEl.style.justifyContent = 'space-between';
    rowEl.style.gap = 'var(--space-3)';
    rowEl.setAttribute('role', 'button');
    rowEl.setAttribute('tabindex', '0');
    rowEl.setAttribute('aria-selected', 'false');
    rowEl.setAttribute('data-id', l.id);

    // ── left: identity (FIFO rank · lot id · strain · sku) ──
    var left = document.createElement('div');
    left.style.display = 'flex';
    left.style.flexDirection = 'column';
    left.style.gap = '2px';
    left.style.minWidth = '0';

    var idLine = document.createElement('div');
    idLine.style.display = 'flex';
    idLine.style.alignItems = 'center';
    idLine.style.gap = 'var(--space-2)';

    // FIFO front-of-queue marker on the oldest-expiry lot
    if (idx === 0) {
      var fifoBadge = document.createElement('span');
      fifoBadge.className = 'aui-badge aui-badge--primary';
      fifoBadge.textContent = 'FIFO';
      fifoBadge.title = 'Próximo pela regra FIFO (vencimento mais próximo)';
      idLine.appendChild(fifoBadge);
    }

    var idEl = document.createElement('span');
    idEl.className = 'aui-cardlet__title';
    idEl.textContent = l.id;
    idLine.appendChild(idEl);

    var strainEl = document.createElement('span');
    strainEl.className = 'aui-chip';
    strainEl.textContent = l.strain;
    idLine.appendChild(strainEl);

    left.appendChild(idLine);

    var metaEl = document.createElement('div');
    metaEl.className = 'aui-cardlet__meta';

    var skuChip = document.createElement('span');
    skuChip.className = 'aui-chip';
    skuChip.textContent = l.sku;
    metaEl.appendChild(skuChip);

    var qtyChip = document.createElement('span');
    qtyChip.className = 'aui-chip';
    qtyChip.textContent = l.currentQuantityG + 'g disponíveis';
    metaEl.appendChild(qtyChip);

    if (l.coaRef) {
      var coaChip = document.createElement('span');
      coaChip.className = 'aui-chip';
      coaChip.textContent = 'COA ' + l.coaRef;
      coaChip.title = 'Certificado de Análise';
      metaEl.appendChild(coaChip);
    }

    left.appendChild(metaEl);

    // ── right: expiry + urgency + select button ──
    var right = document.createElement('div');
    right.style.display = 'flex';
    right.style.alignItems = 'center';
    right.style.gap = 'var(--space-2)';
    right.style.flexShrink = '0';

    var validity = document.createElement('div');
    validity.style.display = 'flex';
    validity.style.flexDirection = 'column';
    validity.style.alignItems = 'flex-end';
    validity.style.gap = '2px';

    var venceChip = document.createElement('span');
    venceChip.className = 'aui-chip';
    venceChip.textContent = 'Vence ' + fmtBR(l.expiryDate);
    validity.appendChild(venceChip);

    var d = l.daysToExpiry;
    var urgency = document.createElement('span');
    if (typeof d === 'number' && d < 0) {
      urgency.className = 'aui-badge aui-badge--blocked';
      urgency.textContent = 'Vencido';
    } else if (typeof d === 'number' && d < 7) {
      urgency.className = 'aui-badge aui-badge--blocked';
      urgency.textContent = 'Crítico · ' + d + 'd';
    } else if (typeof d === 'number' && d < 30) {
      urgency.className = 'aui-badge aui-badge--expedite';
      urgency.textContent = d + 'd p/ vencer';
    } else {
      urgency.className = 'aui-badge aui-badge--success';
      urgency.textContent = (typeof d === 'number' ? d + 'd' : '—') + ' OK';
    }
    validity.appendChild(urgency);
    right.appendChild(validity);

    var selectBtn = document.createElement('button');
    selectBtn.className = 'aui-btn aui-btn--primary aui-btn--sm';
    selectBtn.type = 'button';
    selectBtn.textContent = 'Selecionar';
    selectBtn.title = 'Selecionar este lote para dispensação';
    right.appendChild(selectBtn);

    rowEl.appendChild(left);
    rowEl.appendChild(right);

    rows.push(rowEl);

    // ── interaction: select for dispensation ──
    var choose = function () {
      clearSelection();
      selectedId = l.id;
      rowEl.style.borderColor = 'var(--primary)';
      rowEl.style.boxShadow = '0 0 0 1px var(--primary)';
      rowEl.setAttribute('aria-selected', 'true');
      selectBtn.textContent = 'Selecionado ✓';
      try {
        if (window.AuiBridge && typeof window.AuiBridge.sendMessage === 'function') {
          window.AuiBridge.sendMessage(
            'Selecionar lote ' + l.id + ' (' + l.strain + ', ' + l.currentQuantityG + 'g, vence ' + l.expiryDate + ') para dispensação.'
          );
        }
      } catch (e) { /* AuiBridge absent in raw preview */ }
    };

    selectBtn.addEventListener('click', function (ev) { ev.stopPropagation(); choose(); });
    rowEl.addEventListener('click', choose);
    rowEl.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); choose(); }
    });

    list.appendChild(rowEl);
  });

  root.appendChild(list);

  // ── legend ──
  var legend = document.createElement('div');
  legend.className = 'aui-legend';
  var keys = [
    { cls: 'aui-badge aui-badge--primary', label: 'FIFO — próximo a dispensar' },
    { cls: 'aui-badge aui-badge--blocked', label: 'Vencido / crítico (<7d)' },
    { cls: 'aui-badge aui-badge--expedite', label: 'Vence em <30d' },
    { cls: 'aui-badge aui-badge--success', label: 'Validade OK' }
  ];
  keys.forEach(function (k) {
    var it = document.createElement('span');
    it.className = 'aui-legend__item';
    var b = document.createElement('span');
    b.className = k.cls;
    b.textContent = k.label;
    it.appendChild(b);
    legend.appendChild(it);
  });
  root.appendChild(legend);
}
`;

function html(data: Record<string, unknown>): string {
  return htmlShell({
    title: "Seletor de Lotes (FIFO)",
    categoryLabel: "Inventory",
    subtitle: `${data.total} lote(s) liberado(s) · ${data.totalAvailableG}g disponíveis · ${data.criticalCount} c/ vencimento crítico · ordem FIFO (vencimento mais próximo) · em ${data.asOf}`,
    data,
    bodyHtml: `<div id="lot-picker"></div>`,
    renderJs: RENDER_JS,
  });
}

export const def: WidgetDef = {
  name: "canna_inventory_lot_picker",
  title: "Seletor de Lotes (FIFO)",
  description:
    "Seletor de lotes de extrato de cannabis liberados (status RELEASED) para dispensação, em associações terapêuticas (ANVISA RDC 1.014/2026). Lista os lotes disponíveis ordenados por FIFO (vencimento mais próximo primeiro), cada um com id do lote, strain/produto, gramas disponíveis, data de validade, dias para vencer, urgência (vencido / crítico <7d / vence <30d / OK) e referência de COA. Cada linha é selecionável; selecionar um lote pede ao assistente para iniciar a dispensação contra aquele lote. O lote no topo da fila FIFO recebe um marcador. Sem PII de associados — somente id, SKU/strain, gramas, datas e COA (LGPD). Read-model ainda não pronto: dados sintéticos determinísticos para revisão da galeria.",
  category: "inventory",
  inputShape: {},
  resourceUri: "ui://canna/inventory-lot-picker",
  resourceName: "inventory-lot-picker",
  version: "0.1.0",
  status: "experimental",
  added: "2026-06-10",
  buildData,
  summary,
  html,
  meta: { prefersBorder: true, csp: { connectDomains: ["self"] } },
};
