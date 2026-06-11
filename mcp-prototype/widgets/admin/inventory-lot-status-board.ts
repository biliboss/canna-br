/**
 * Painel de Lotes — Status e Validade (canna-br admin control-center).
 *
 * Kanban-style board (HTML, no SVG) of cannabis-extract lots across their
 * regulatory lifecycle: Quarentena → Disponível → Esgotado → Recolhido. Each
 * card carries a fill meter (gramas restantes / iniciais), a validity chip, an
 * urgency badge (vencimento crítico < 7d), origin + COA references, and links
 * to the SNGPC-traceable lot detail. Built for DIRETORIA / RT / DPO / AUDITOR.
 *
 * LGPD: lots carry no member PII — only SKUs, grams, dates, COA refs. Where a
 * person is referenced (origin of a recall, e.g.), they appear as initials +
 * a CPF-hash suffix, never full names/CPF.
 *
 * Compose: .aui-board > .aui-col > .aui-cardlet, painted entirely via tokens.
 * Clicking a card asks the assistant for that lot's detail/traceability.
 */
import { htmlShell } from "../../kit/shell.js";
import { mulberry32, randInt, pick, addDays, daysBetween, fmtDay, ANCHOR, type WidgetDef } from "../../kit/types.js";

interface Column {
  key: string;
  title: string;
  wipLimit: number | null;
}

type LotStatus = "QUARANTINED" | "AVAILABLE" | "EXHAUSTED" | "RECALLED";

interface Lot {
  id: string;
  sku: string;
  status: LotStatus;
  initialG: number;
  currentG: number;
  expiresAt: string;
  origin: string;
  coaRef?: string;
  daysToExpiry: number;
  recallReason?: string;
}

const COLUMNS: Column[] = [
  { key: "QUARANTINED", title: "Quarentena", wipLimit: 3 },
  { key: "AVAILABLE", title: "Disponível", wipLimit: null },
  { key: "EXHAUSTED", title: "Esgotado", wipLimit: null },
  { key: "RECALLED", title: "Recolhido", wipLimit: null },
];

// Realistic cannabis-extract SKUs (cannabinoid · form · mg/mL · sequence).
const SKU_BASES = [
  "CBD-ISO-30",
  "CBD-FULL-50",
  "CBD-BROAD-20",
  "CBD-CBG-15",
  "THC-FULL-05",
  "CBD-ISO-100",
  "CBD-RICK-200",
  "CBD-CBN-10",
];

// Origins: importer/cultivator codes + ANVISA import-authorization stubs.
const ORIGINS = [
  "Imp. Prati-Donaduzzi",
  "Imp. Verdemed",
  "Cult. assoc. interno",
  "Imp. GreenCare",
  "Imp. Anandam",
  "Cult. assoc. interno",
];

// COA (Certificate of Analysis) lab references.
const COA_LABS = ["EUROFINS", "BIOAGRI", "MERIEUX", "SGS"];

// Recall reasons — RT/ANVISA driven. Person references use initials + hash.
const RECALL_REASONS = [
  "COA reprovado — metais pesados acima do limite",
  "Desvio de potência (LC-MS) fora da faixa rotulada",
  "Recolhimento voluntário do importador",
  "Contaminação microbiológica (aerobios totais)",
];

function buildData(args: Record<string, unknown>): Record<string, unknown> {
  const asOf = typeof args.as_of === "string" ? args.as_of : ANCHOR;
  const rng = mulberry32(8304);

  // How many lots land in each lifecycle column. Quarentena is intentionally
  // pushed to its WIP limit boundary to surface the intake bottleneck.
  const distribution: Record<LotStatus, number> = {
    QUARANTINED: 3,
    AVAILABLE: 5,
    EXHAUSTED: 2,
    RECALLED: 2,
  };

  const lots: Lot[] = [];
  let n = 0;
  for (const col of COLUMNS) {
    const status = col.key as LotStatus;
    const count = distribution[status];
    for (let i = 0; i < count; i++) {
      const base = pick(rng, SKU_BASES);
      const seq = String(randInt(rng, 1, 48)).padStart(3, "0");
      const sku = base + "-" + seq;
      const initialG = pick(rng, [30, 50, 100, 150, 200, 250]);

      // Expiry window varies by status — exhausted/recalled lean older.
      let expiryOffset: number;
      if (status === "QUARANTINED") expiryOffset = randInt(rng, 120, 540);
      else if (status === "AVAILABLE") expiryOffset = randInt(rng, -2, 420);
      else if (status === "EXHAUSTED") expiryOffset = randInt(rng, -60, 180);
      else expiryOffset = randInt(rng, -30, 300);
      const expiresAt = addDays(asOf, expiryOffset);
      const daysToExpiry = daysBetween(asOf, expiresAt);

      // Fill meter: remaining grams over initial. Lifecycle drives the fill.
      let currentG: number;
      if (status === "EXHAUSTED") currentG = 0;
      else if (status === "QUARANTINED") currentG = initialG; // not yet dispensed
      else if (status === "AVAILABLE") currentG = randInt(rng, 4, initialG - 1);
      else currentG = randInt(rng, 0, initialG); // recalled: whatever was left

      // COA: quarantine may still be awaiting it; others have a ref.
      const hasCoa = status === "QUARANTINED" ? rng() < 0.45 : true;
      const coaRef = hasCoa ? COA_LABS[randInt(rng, 0, COA_LABS.length - 1)] + "-" + String(randInt(rng, 10000, 99999)) : undefined;

      const lot: Lot = {
        id: "LOTE-" + String(2400 + n),
        sku,
        status,
        initialG,
        currentG,
        expiresAt,
        origin: pick(rng, ORIGINS),
        coaRef,
        daysToExpiry,
      };
      if (status === "RECALLED") lot.recallReason = pick(rng, RECALL_REASONS);
      lots.push(lot);
      n++;
    }
  }

  const counts: Record<string, number> = {};
  for (const col of COLUMNS) counts[col.key] = 0;
  for (const l of lots) counts[l.status] = (counts[l.status] ?? 0) + 1;

  const availableLots = lots.filter((l) => l.status === "AVAILABLE");
  const totalAvailableG = availableLots.reduce((s, l) => s + l.currentG, 0);
  const criticalCount = lots.filter((l) => l.status !== "EXHAUSTED" && l.status !== "RECALLED" && l.daysToExpiry < 7).length;
  const recalledCount = counts.RECALLED ?? 0;
  const overCols = COLUMNS.filter((col) => col.wipLimit != null && (counts[col.key] ?? 0) > col.wipLimit).map((col) => ({
    key: col.key,
    title: col.title,
    count: counts[col.key] ?? 0,
    limit: col.wipLimit as number,
  }));

  return {
    asOf,
    columns: COLUMNS,
    lots,
    counts,
    total: lots.length,
    totalAvailableG,
    criticalCount,
    recalledCount,
    overCols,
  };
}

function summary(data: Record<string, unknown>): string {
  const columns = data.columns as Column[];
  const counts = data.counts as Record<string, number>;
  const critical = data.criticalCount as number;
  const recalled = data.recalledCount as number;
  const colSummary = columns.map((c) => `${c.title} ${counts[c.key] ?? 0}`).join(", ");
  return (
    `Painel de Lotes (em ${data.asOf}): ${data.total} lotes — ${colSummary}; ` +
    `${data.totalAvailableG}g disponíveis; ${critical} com vencimento crítico (<7d); ` +
    `${recalled} recolhido(s). Clique num lote para detalhe e rastreabilidade SNGPC.`
  );
}

const RENDER_JS = `
function render(data) {
  var root = document.getElementById('aui-body');
  root.innerHTML = '';

  var columns = data.columns || [];
  var lots = data.lots || [];
  var counts = data.counts || {};

  // status → cardlet accent (reuses class-of-service border tokens, no hardcoded color)
  var STATUS_ACCENT = {
    'QUARANTINED': 'cos-fixed-date',
    'AVAILABLE': 'cos-standard',
    'EXHAUSTED': 'cos-intangible',
    'RECALLED': 'blocked'
  };

  function fmtBR(iso) {
    // iso = YYYY-MM-DD → DD/MM
    var p = String(iso).split('-');
    return p.length === 3 ? (p[2] + '/' + p[1]) : iso;
  }

  var board = document.createElement('div');
  board.className = 'aui-board';

  columns.forEach(function (col) {
    var count = counts[col.key] || 0;
    var over = (col.wipLimit != null) && (count > col.wipLimit);

    var colEl = document.createElement('div');
    colEl.className = 'aui-col';

    // ── column head ──
    var head = document.createElement('div');
    head.className = 'aui-col__head';

    var title = document.createElement('span');
    title.className = 'aui-col__title';
    title.textContent = col.title;

    var countEl = document.createElement('span');
    countEl.className = 'aui-col__count' + (over ? ' over' : '');
    countEl.textContent = (col.wipLimit != null) ? (count + '/' + col.wipLimit) : String(count);

    head.appendChild(title);
    head.appendChild(countEl);
    colEl.appendChild(head);

    // ── lot cards in this column ──
    lots.filter(function (l) { return l.status === col.key; }).forEach(function (l) {
      var cardEl = document.createElement('div');
      cardEl.className = 'aui-cardlet ' + (STATUS_ACCENT[l.status] || 'cos-standard') + (l.status === 'RECALLED' ? ' blocked' : '');
      cardEl.setAttribute('role', 'button');
      cardEl.setAttribute('tabindex', '0');
      cardEl.setAttribute('data-id', l.id);

      // SKU title
      var titleEl = document.createElement('div');
      titleEl.className = 'aui-cardlet__title';
      titleEl.textContent = l.sku;
      cardEl.appendChild(titleEl);

      // ── fill meter: currentG / initialG ──
      var initialG = l.initialG || 0;
      var currentG = (typeof l.currentG === 'number') ? l.currentG : 0;
      var pct = initialG > 0 ? Math.round((currentG / initialG) * 100) : 0;

      var fillRow = document.createElement('div');
      fillRow.style.display = 'flex';
      fillRow.style.alignItems = 'center';
      fillRow.style.justifyContent = 'space-between';
      fillRow.style.gap = 'var(--space-2)';
      fillRow.style.marginBottom = '4px';

      var fillLabel = document.createElement('span');
      fillLabel.className = 'aui-chip';
      fillLabel.textContent = currentG + 'g / ' + initialG + 'g';
      fillRow.appendChild(fillLabel);
      cardEl.appendChild(fillRow);

      // depleted (available lot running low) reuses the --over treatment as a stock signal
      var low = (l.status === 'AVAILABLE') && (pct <= 15);
      var progress = document.createElement('div');
      progress.className = 'aui-progress' + (low ? ' aui-progress--over' : '');
      var bar = document.createElement('div');
      bar.className = 'aui-progress__bar';
      bar.style.width = Math.max(0, Math.min(100, pct)) + '%';
      progress.appendChild(bar);
      cardEl.appendChild(progress);

      // ── meta row: validity / urgency / origin / COA / recall ──
      var meta = document.createElement('div');
      meta.className = 'aui-cardlet__meta';
      meta.style.marginTop = '8px';

      // validity chip
      var venceChip = document.createElement('span');
      venceChip.className = 'aui-chip';
      venceChip.textContent = 'Vence ' + fmtBR(l.expiresAt);
      meta.appendChild(venceChip);

      // urgency badge (only for live stock: quarentena/disponível)
      var live = (l.status === 'QUARANTINED' || l.status === 'AVAILABLE');
      if (live && typeof l.daysToExpiry === 'number') {
        if (l.daysToExpiry < 0) {
          var venc = document.createElement('span');
          venc.className = 'aui-badge aui-badge--blocked';
          venc.textContent = 'Vencido';
          meta.appendChild(venc);
        } else if (l.daysToExpiry < 7) {
          var crit = document.createElement('span');
          crit.className = 'aui-badge aui-badge--blocked';
          crit.textContent = 'Vencimento crítico';
          meta.appendChild(crit);
        } else if (l.daysToExpiry < 30) {
          var exp = document.createElement('span');
          exp.className = 'aui-badge aui-badge--expedite';
          exp.textContent = l.daysToExpiry + 'd p/ vencer';
          meta.appendChild(exp);
        }
      }

      // origin chip
      var originChip = document.createElement('span');
      originChip.className = 'aui-chip';
      originChip.textContent = l.origin;
      originChip.title = 'Origem do lote';
      meta.appendChild(originChip);

      // COA ref chip, or "sem COA" badge while in quarantine awaiting analysis
      if (l.coaRef) {
        var coaChip = document.createElement('span');
        coaChip.className = 'aui-chip';
        coaChip.textContent = 'COA ' + l.coaRef;
        coaChip.title = 'Certificado de Análise';
        meta.appendChild(coaChip);
      } else if (l.status === 'QUARANTINED') {
        var noCoa = document.createElement('span');
        noCoa.className = 'aui-badge aui-badge--warning';
        noCoa.textContent = 'sem COA';
        noCoa.title = 'Aguardando Certificado de Análise (RT)';
        meta.appendChild(noCoa);
      }

      // recall reason badge
      if (l.status === 'RECALLED' && l.recallReason) {
        var rr = document.createElement('span');
        rr.className = 'aui-badge aui-badge--destructive';
        rr.textContent = 'Recolhido';
        rr.title = l.recallReason;
        meta.appendChild(rr);
      }

      cardEl.appendChild(meta);

      // ── interaction: ask the assistant for lot detail + SNGPC traceability ──
      var ask = function () {
        try {
          if (window.AuiBridge && typeof window.AuiBridge.sendMessage === 'function') {
            window.AuiBridge.sendMessage('Detalhe do lote ' + l.id);
          }
        } catch (e) { /* AuiBridge absent in raw preview */ }
      };
      cardEl.addEventListener('click', ask);
      cardEl.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); ask(); }
      });

      colEl.appendChild(cardEl);
    });

    // empty column hint
    if (count === 0) {
      var empty = document.createElement('div');
      empty.className = 'aui-empty';
      empty.style.padding = 'var(--space-3)';
      empty.textContent = 'Sem lotes';
      colEl.appendChild(empty);
    }

    board.appendChild(colEl);
  });

  root.appendChild(board);

  // ── legend / urgency key ──
  var legend = document.createElement('div');
  legend.className = 'aui-legend';
  var keys = [
    { cls: 'aui-badge aui-badge--blocked', label: 'Vencimento crítico (<7d)' },
    { cls: 'aui-badge aui-badge--expedite', label: 'Vence em <30d' },
    { cls: 'aui-badge aui-badge--warning', label: 'Sem COA (quarentena)' },
    { cls: 'aui-badge aui-badge--destructive', label: 'Recolhido' }
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
    title: "Painel de Lotes — Status e Validade",
    categoryLabel: "Inventory",
    subtitle: `${data.total} lotes · ${data.totalAvailableG}g disponíveis · ${data.criticalCount} c/ vencimento crítico · em ${data.asOf} · clique num lote p/ rastreabilidade`,
    data,
    bodyHtml: `<div class="aui-board" id="board"></div>`,
    renderJs: RENDER_JS,
    wide: true,
  });
}

export const def: WidgetDef = {
  name: "canna_lot_board",
  title: "Painel de Lotes — Status e Validade",
  description:
    "Painel de inventário de lotes de extrato de cannabis para associações terapêuticas (ANVISA RDC 1.014/2026): board kanban dos lotes no ciclo regulatório — Quarentena → Disponível → Esgotado → Recolhido. Cada card mostra SKU, medidor de preenchimento (gramas restantes/iniciais), validade, urgência de vencimento (<7d = crítico, <30d = expedir), origem, referência de COA (ou 'sem COA' em quarentena) e motivo de recolhimento. Quarentena tem limite WIP. Clicar num lote pede detalhe e rastreabilidade SNGPC ao assistente. Sem PII de associados — somente SKU, gramas, datas e COA (LGPD). Dados sintéticos quando sem argumentos.",
  category: "inventory",
  inputShape: {},
  resourceUri: "ui://canna/inventory-lot-status-board",
  resourceName: "inventory-lot-status-board",
  version: "0.1.0",
  status: "experimental",
  added: "2026-06-10",
  buildData,
  summary,
  html,
  meta: { prefersBorder: true, csp: { connectDomains: ["self"] } },
};
