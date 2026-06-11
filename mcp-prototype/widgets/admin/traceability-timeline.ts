/**
 * Linha do Tempo de Rastreabilidade — traceability-timeline (canna-br admin control-center).
 *
 * The end-to-end chain-of-custody for ONE dispensation, rendered as an ordered
 * vertical timeline: Associado → Prescrição → Lote (FIFO) → Dispensação → SNGPC.
 * Each node is a kit-styled step carrying a phase label, a status/type badge,
 * a timestamp and a ref/actor line (who/what touched the record). Consecutive
 * nodes are joined by a kit-token connector so the custody flow reads top-down.
 *
 * This is the audit/traceability view the RT (Responsável Técnico) and the
 * fiscalização (ANVISA / VISA) follow to prove every gram of cannabis extract
 * is traceable from member enrollment through SNGPC reporting (RDC 1.014/2026).
 *
 * Read-model NOT ready (the live traceability tool is a v0.2.1 stub returning an
 * empty chain); data here is deterministic synthetic (mulberry32) purely so the
 * gallery card is visible for review. A live tool-result re-fires render() with
 * the real custody chain later. Data shape preserved: an ordered list of nodes,
 * each with a phase label + timestamp + ref/actor.
 *
 * LGPD: the member appears only as an opaque associate id (ASSOC-…), never name
 * or CPF — the chain proves traceability without exposing PII.
 *
 * Compose: kit atoms (.aui-badge, .aui-chip, .aui-card) + tokens only.
 * No hand-rolled <style>, no --mcp-app-* tokens.
 */
import { htmlShell } from "../../kit/shell.js";
import { mulberry32, randInt, pick, addDays, ANCHOR, type WidgetDef } from "../../kit/types.js";

type NodeKind = "enrollment" | "prescription" | "lot" | "dispensation" | "report";

interface TraceNode {
  /** ordered phase label (Associado, Prescrição, …) */
  phase: string;
  /** node kind → drives the badge variant */
  kind: NodeKind;
  /** badge text (state/type for this phase) */
  badge: string;
  /** ISO timestamp this phase occurred */
  date: string;
  /** the record reference touched at this phase (lot id, prescription id, …) */
  ref: string;
  /** the actor responsible (médico, RT, sistema, …) */
  actor: string;
}

// The five-node custody chain template. Synthetic values are filled per-run so
// the chain reads as one concrete dispensation while staying deterministic.
const PHASES: { phase: string; kind: NodeKind; badge: string; actorPool: string[] }[] = [
  { phase: "Associado", kind: "enrollment", badge: "Vínculo ativo", actorPool: ["Secretaria", "Cadastro"] },
  { phase: "Prescrição", kind: "prescription", badge: "Prescrição válida", actorPool: ["Dr. A. Moreira (CRM)", "Dra. C. Lima (CRM)", "Dr. R. Tavares (CRM)"] },
  { phase: "Lote (FIFO)", kind: "lot", badge: "Lote liberado", actorPool: ["Estoque / QA", "Curadoria"] },
  { phase: "Dispensação", kind: "dispensation", badge: "Dispensado", actorPool: ["RT / Farmácia", "Diretoria"] },
  { phase: "SNGPC", kind: "report", badge: "Transmitido", actorPool: ["Sistema · ANVISA", "Compliance"] },
];

// kind → kit badge variant. Each phase reads with a distinct semantic colour so
// the chain is scannable: vínculo/neutral, prescrição/primary, lote/success,
// dispensação/expedite, SNGPC/done.
const BADGE_VARIANT: Record<NodeKind, string> = {
  enrollment: "aui-badge--neutral",
  prescription: "aui-badge--primary",
  lot: "aui-badge--success",
  dispensation: "aui-badge--expedite",
  report: "aui-badge--done",
};

const STRAINS = ["Charlotte's Web", "ACDC", "Harlequin", "Cannatonic", "Ringo's Gift"];

function buildData(args: Record<string, unknown>): Record<string, unknown> {
  const asOf = typeof args.as_of === "string" ? args.as_of : ANCHOR;
  const rng = mulberry32(48211);

  // One concrete dispensation: build the identifiers shared across the chain.
  const assocId = "ASSOC-01J8Z4K2M" + String(randInt(rng, 10, 99));
  const presId = "PRESC-" + String(randInt(rng, 1000, 9999));
  const lotId = "LOTE-" + String(2500 + randInt(rng, 0, 40));
  const strain = pick(rng, STRAINS);
  const dispId = "DISP-" + String(randInt(rng, 10000, 99999));
  const sngpcProto = "SNGPC-" + asOf.replace(/-/g, "") + "-" + String(randInt(rng, 100, 999));

  // Walk the chain backwards from asOf so the timestamps stay strictly ordered:
  // enrollment (oldest) → … → SNGPC report (asOf - 1).
  const offsets = [-149, -127, -21, -2, -1]; // days from asOf per phase
  const refs = [assocId, presId, lotId + " · " + strain, dispId, sngpcProto];

  const timeline: TraceNode[] = PHASES.map((p, i) => ({
    phase: p.phase,
    kind: p.kind,
    badge: p.badge,
    date: addDays(asOf, offsets[i] ?? -1),
    ref: refs[i] ?? "",
    actor: pick(rng, p.actorPool),
  }));

  return {
    asOf,
    timeline,
    total: timeline.length,
    dispensationId: dispId,
    lotId,
    strain,
  };
}

function summary(data: Record<string, unknown>): string {
  const timeline = (data.timeline as TraceNode[]) ?? [];
  if (timeline.length === 0) {
    return `Linha do tempo de rastreabilidade em ${data.asOf}: nenhum evento de custódia registrado para esta dispensação.`;
  }
  const first = timeline[0];
  const last = timeline[timeline.length - 1];
  return (
    `Cadeia de custódia da dispensação ${data.dispensationId} (lote ${data.lotId} · ${data.strain}) em ${data.asOf}: ` +
    `${timeline.length} eventos rastreados de ${first?.phase} (${first?.date}) a ${last?.phase} (${last?.date}). ` +
    `Cada elo carrega referência + responsável — prova de rastreabilidade ponta-a-ponta (SNGPC / ANVISA RDC 1.014/2026), sem PII do associado.`
  );
}

const RENDER_JS = `
function render(data) {
  var root = document.getElementById('aui-body');
  root.innerHTML = '';

  var timeline = (data && data.timeline) || [];

  // ── empty state ──
  if (!timeline.length) {
    var empty = document.createElement('div');
    empty.className = 'aui-empty';
    empty.textContent = 'Sem eventos de rastreabilidade';
    root.appendChild(empty);
    return;
  }

  function fmtBR(iso) {
    var p = String(iso).split('-');
    return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : iso;
  }

  var VARIANT = {
    enrollment: 'aui-badge--neutral',
    prescription: 'aui-badge--primary',
    lot: 'aui-badge--success',
    dispensation: 'aui-badge--expedite',
    report: 'aui-badge--done'
  };

  var card = document.createElement('div');
  card.className = 'aui-card';
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.gap = '0';

  timeline.forEach(function (node, idx) {
    var isLast = idx === timeline.length - 1;

    // ── row: rail (dot + connector) | content ──
    var row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'stretch';
    row.style.gap = 'var(--space-3)';

    // rail column: a node dot, then a vertical connector to the next node
    var rail = document.createElement('div');
    rail.style.display = 'flex';
    rail.style.flexDirection = 'column';
    rail.style.alignItems = 'center';
    rail.style.flexShrink = '0';
    rail.style.width = '14px';

    var dot = document.createElement('span');
    dot.style.width = '11px';
    dot.style.height = '11px';
    dot.style.borderRadius = '50%';
    dot.style.flexShrink = '0';
    dot.style.marginTop = '4px';
    dot.style.background = isLast ? 'var(--primary)' : 'var(--card)';
    dot.style.border = '2px solid var(--primary)';
    dot.style.boxShadow = '0 0 0 3px var(--background)';
    rail.appendChild(dot);

    if (!isLast) {
      var connector = document.createElement('span');
      connector.style.flex = '1 1 auto';
      connector.style.width = '2px';
      connector.style.minHeight = 'var(--space-4)';
      connector.style.marginTop = '2px';
      connector.style.marginBottom = '2px';
      connector.style.background = 'var(--border)';
      rail.appendChild(connector);
    }

    // content column
    var content = document.createElement('div');
    content.style.flex = '1 1 auto';
    content.style.minWidth = '0';
    content.style.paddingBottom = isLast ? '0' : 'var(--space-4)';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.gap = 'var(--space-2)';

    // header: ordinal + phase title + status/type badge
    var head = document.createElement('div');
    head.style.display = 'flex';
    head.style.alignItems = 'center';
    head.style.gap = 'var(--space-2)';
    head.style.flexWrap = 'wrap';

    var ord = document.createElement('span');
    ord.className = 'aui-badge aui-badge--category';
    ord.textContent = (idx + 1) + ' / ' + timeline.length;
    head.appendChild(ord);

    var title = document.createElement('span');
    title.className = 'aui-cardlet__title';
    title.style.marginBottom = '0';
    title.textContent = node.phase || '—';
    head.appendChild(title);

    if (node.badge) {
      var badge = document.createElement('span');
      var variant = VARIANT[node.kind] || 'aui-badge--neutral';
      badge.className = 'aui-badge ' + variant;
      badge.textContent = node.badge;
      head.appendChild(badge);
    }

    content.appendChild(head);

    // meta: timestamp chip + ref chip + actor chip
    var meta = document.createElement('div');
    meta.className = 'aui-cardlet__meta';

    var dateChip = document.createElement('span');
    dateChip.className = 'aui-chip';
    dateChip.textContent = fmtBR(node.date);
    meta.appendChild(dateChip);

    if (node.ref) {
      var refChip = document.createElement('span');
      refChip.className = 'aui-chip';
      refChip.textContent = node.ref;
      meta.appendChild(refChip);
    }

    if (node.actor) {
      var actorChip = document.createElement('span');
      actorChip.className = 'aui-chip';
      actorChip.textContent = '\\u00b7 ' + node.actor;
      actorChip.title = 'Responsável por este elo da cadeia';
      meta.appendChild(actorChip);
    }

    content.appendChild(meta);

    row.appendChild(rail);
    row.appendChild(content);
    card.appendChild(row);
  });

  root.appendChild(card);

  // ── legend: one swatch per phase kind ──
  var legend = document.createElement('div');
  legend.className = 'aui-legend';
  var keys = [
    { cls: 'aui-badge aui-badge--neutral', label: 'Associado' },
    { cls: 'aui-badge aui-badge--primary', label: 'Prescrição' },
    { cls: 'aui-badge aui-badge--success', label: 'Lote' },
    { cls: 'aui-badge aui-badge--expedite', label: 'Dispensação' },
    { cls: 'aui-badge aui-badge--done', label: 'SNGPC' }
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
    title: "Linha do Tempo de Rastreabilidade",
    categoryLabel: "Traceability",
    subtitle: `Cadeia de custódia da dispensação ${data.dispensationId} · lote ${data.lotId} (${data.strain}) · ${data.total} elos · Associado → SNGPC · em ${data.asOf}`,
    data,
    bodyHtml: `<div id="traceability-timeline"></div>`,
    renderJs: RENDER_JS,
  });
}

export const def: WidgetDef = {
  name: "canna_traceability_timeline",
  title: "Linha do Tempo de Rastreabilidade",
  description:
    "Linha do tempo de rastreabilidade (cadeia de custódia) de uma dispensação de extrato de cannabis em associação terapêutica (ANVISA RDC 1.014/2026). Renderiza os elos ordenados Associado → Prescrição → Lote (FIFO) → Dispensação → SNGPC como uma timeline vertical, cada nó com rótulo da fase, badge de status/tipo, timestamp, referência do registro (id de prescrição/lote/dispensação/protocolo) e o responsável (médico/RT/sistema). É a visão de auditoria que o RT e a fiscalização (ANVISA/VISA) seguem para provar que cada grama é rastreável do vínculo do associado à transmissão SNGPC. Associado aparece só como id opaco (ASSOC-…), sem nome ou CPF (LGPD). Read-model ainda não pronto: dados sintéticos determinísticos para revisão da galeria.",
  category: "traceability",
  inputShape: {},
  resourceUri: "ui://canna/traceability-timeline",
  resourceName: "traceability-timeline",
  version: "0.1.0",
  status: "experimental",
  added: "2026-06-10",
  buildData,
  summary,
  html,
  meta: { prefersBorder: true, csp: { connectDomains: ["self"] } },
};
