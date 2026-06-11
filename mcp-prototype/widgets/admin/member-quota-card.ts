/**
 * Member Quota Card — single-member view of the monthly cannabis-extract quota
 * for one associate of a therapeutic association (ANVISA RDC 1.014/2026).
 *
 * The single-member counterpart of quota-consumption-scorecard.ts: instead of
 * five association-wide KPIs, this card zooms into ONE member and answers a
 * single question — how much of their prescribed monthly limit has been
 * dispensed, and is anything left? It shows the member id + status badge, a
 * prominent consumed/prescribed (g) stat with a progress bar toward the
 * regulatory limit (the bar + badge warn near 80% and block at/over 100%), the
 * remaining grams, and a short "recent dispensations" list (date — grams — lot).
 *
 * Read-model NOT ready (no per-member quota tool wired yet); data here is
 * deterministic synthetic (mulberry32) purely so the gallery card is visible.
 * The live tool-result re-fires render() with the real member payload later.
 *
 * Data shape preserved from the old hand-rolled widget so the live host frame
 * keeps working: { memberId, status, consumedG, prescription:{ monthlyQuotaG },
 * recent:[{ date, quantityG, lotId }] }.
 *
 * LGPD: only an association member id (ULID-like, no PII) + a lot id — no name,
 * no CPF.
 *
 * Compose: kit atoms (.aui-card, .aui-badge, .aui-progress, .aui-statcard,
 * .aui-stat, .aui-cardlet, .aui-chip, .aui-empty) + tokens only. No inline
 * <style>, no --mcp-app-* tokens — htmlShell injects TOKENS→ATOMS→MOLECULES.
 */
import { htmlShell } from "../../kit/shell.js";
import { mulberry32, randInt, pick, addDays, ANCHOR, round1, type WidgetDef } from "../../kit/types.js";

interface RecentDispensation {
  date: string;
  quantityG: number;
  lotId: string;
}

interface MemberQuotaData {
  memberId: string;
  status: string;
  consumedG: number;
  prescription: { monthlyQuotaG: number };
  remainingG: number;
  pct: number;
  recent: RecentDispensation[];
  competencia: string;
}

const LOT_HEX = "0123456789ABCDEF";

function lotId(rng: () => number): string {
  let suffix = "";
  for (let i = 0; i < 5; i++) suffix += LOT_HEX[randInt(rng, 0, 15)];
  return "01J8ZQ4LOT0" + suffix;
}

function buildData(args: Record<string, unknown>): Record<string, unknown> {
  const asOf = typeof args.as_of === "string" ? args.as_of : ANCHOR;
  const competencia = asOf.slice(0, 7);
  const rng = mulberry32(4521);

  // Prescribed monthly limit (g) + consumption deliberately seeded into the
  // "near the cap" warning band so the progress bar + badge exercise the
  // warning tokens in the gallery preview (≈85% utilised).
  const monthlyQuotaG = 45;
  const consumedG = 38.5;
  const remainingG = round1(Math.max(0, monthlyQuotaG - consumedG));
  const pct = monthlyQuotaG > 0 ? Math.round((consumedG / monthlyQuotaG) * 100) : 0;

  // Recent dispensations that sum to the consumed total, newest first.
  const recent: RecentDispensation[] = [
    { date: addDays(asOf, -2), quantityG: 12.0, lotId: lotId(rng) },
    { date: addDays(asOf, -13), quantityG: 15.0, lotId: lotId(rng) },
    { date: addDays(asOf, -27), quantityG: 11.5, lotId: lotId(rng) },
  ];

  const member: MemberQuotaData = {
    memberId: "ASSOC-01J8Z4K2M9",
    status: "ATIVO",
    consumedG,
    prescription: { monthlyQuotaG },
    remainingG,
    pct,
    recent,
    competencia,
  };

  // Avoid an "unused" lint on pick — keep it imported for parity with siblings.
  void pick;

  return member as unknown as Record<string, unknown>;
}

function summary(data: Record<string, unknown>): string {
  const memberId = data.memberId as string;
  const status = data.status as string;
  const consumedG = data.consumedG as number;
  const cap = (data.prescription as { monthlyQuotaG?: number } | undefined)?.monthlyQuotaG ?? 0;
  const remainingG = data.remainingG as number;
  const pct = data.pct as number;
  const recent = (data.recent as RecentDispensation[]) ?? [];
  const band = pct >= 100 ? "ESTOURADA" : pct >= 80 ? "PRÓXIMA DO LIMITE" : "dentro da cota";
  return (
    `Cota mensal do associado ${memberId} (${status}, competência ${data.competencia}): ` +
    `${consumedG}g dispensados de ${cap}g prescritos (${pct}% — ${band}), ` +
    `${remainingG}g restantes. ` +
    `${recent.length} dispensação(ões) recente(s) registrada(s).`
  );
}

const RENDER_JS = `
function render(data) {
  var root = document.getElementById('aui-body');
  root.innerHTML = '';

  // ── empty state ──
  if (!data || !data.memberId) {
    var empty = document.createElement('div');
    empty.className = 'aui-empty';
    empty.style.padding = 'var(--space-4)';
    empty.textContent = 'Nenhum associado selecionado';
    root.appendChild(empty);
    return;
  }

  function fmtBR(iso) {
    var p = String(iso).split('-');
    return p.length === 3 ? (p[2] + '/' + p[1] + '/' + p[0]) : iso;
  }

  var cap = (data.prescription && data.prescription.monthlyQuotaG) || 0;
  var consumed = (typeof data.consumedG === 'number') ? data.consumedG : 0;
  var pct = (typeof data.pct === 'number')
    ? data.pct
    : (cap > 0 ? Math.round((consumed / cap) * 100) : 0);
  var remaining = (typeof data.remainingG === 'number')
    ? data.remainingG
    : Math.max(0, Math.round((cap - consumed) * 10) / 10);

  // Severity bands toward the regulatory limit:
  //   < 80%  → ok (primary), 80–99% → warning (atenção), >= 100% → blocked (estourada).
  var over = pct >= 100;
  var warn = pct >= 80 && pct < 100;
  var badgeCls = over ? 'aui-badge--blocked' : warn ? 'aui-badge--warning' : 'aui-badge--success';
  var badgeLabel = over ? 'cota estourada' : warn ? 'próxima do limite' : 'dentro da cota';

  var card = document.createElement('div');
  card.className = 'aui-card';
  card.style.display = 'flex';
  card.style.flexDirection = 'column';
  card.style.gap = 'var(--space-3)';
  card.style.padding = 'var(--space-4)';

  // ── header: member id + status badge ──
  var head = document.createElement('div');
  head.className = 'aui-statcard__row';
  head.style.alignItems = 'center';

  var idWrap = document.createElement('div');
  idWrap.style.display = 'flex';
  idWrap.style.flexDirection = 'column';
  idWrap.style.gap = '2px';
  idWrap.style.minWidth = '0';

  var idEl = document.createElement('span');
  idEl.className = 'aui-cardlet__title';
  idEl.textContent = data.memberId;
  idWrap.appendChild(idEl);

  var compEl = document.createElement('span');
  compEl.className = 'aui-stat__unit';
  compEl.style.marginLeft = '0';
  compEl.textContent = 'competência ' + (data.competencia || '—');
  idWrap.appendChild(compEl);

  head.appendChild(idWrap);

  var statusBadge = document.createElement('span');
  statusBadge.className = 'aui-badge ' +
    (String(data.status).toUpperCase() === 'ATIVO' ? 'aui-badge--success' : 'aui-badge--neutral');
  statusBadge.textContent = data.status || '—';
  head.appendChild(statusBadge);

  card.appendChild(head);

  // ── prominent quota stat: consumed / prescribed (g) ──
  var statRow = document.createElement('div');
  statRow.className = 'aui-statcard__row';
  statRow.style.alignItems = 'flex-end';

  var stat = document.createElement('div');
  stat.className = 'aui-stat';
  stat.innerHTML =
    '<span class="aui-stat__label">Dispensado no mês</span>' +
    '<span><span class="aui-stat__value">' + consumed + '</span>' +
    '<span class="aui-stat__unit">/ ' + cap + ' g</span></span>';
  statRow.appendChild(stat);

  var pctBadge = document.createElement('span');
  pctBadge.className = 'aui-badge ' + badgeCls;
  pctBadge.textContent = pct + '% · ' + badgeLabel;
  statRow.appendChild(pctBadge);

  card.appendChild(statRow);

  // ── progress bar toward the regulatory limit (warns near / over the cap) ──
  var progress = document.createElement('div');
  progress.className = 'aui-progress' + (over ? ' aui-progress--over' : '');
  progress.setAttribute('role', 'progressbar');
  progress.setAttribute('aria-valuemin', '0');
  progress.setAttribute('aria-valuemax', '100');
  progress.setAttribute('aria-valuenow', String(Math.min(100, pct)));

  var bar = document.createElement('div');
  bar.className = 'aui-progress__bar';
  bar.style.width = Math.min(100, pct) + '%';
  // For the 80–99% warning band, paint the bar amber (kit --warning token).
  if (warn) bar.style.background = 'var(--warning)';
  progress.appendChild(bar);
  card.appendChild(progress);

  // ── remaining grams line ──
  var remRow = document.createElement('div');
  remRow.className = 'aui-statcard__row';
  remRow.style.alignItems = 'baseline';

  var remLabel = document.createElement('span');
  remLabel.className = 'aui-stat__label';
  remLabel.textContent = 'Restante na cota';
  remRow.appendChild(remLabel);

  var remVal = document.createElement('span');
  remVal.className = 'aui-stat__delta';
  remVal.textContent = remaining + ' g';
  remRow.appendChild(remVal);

  card.appendChild(remRow);
  root.appendChild(card);

  // ── recent dispensations list (date — grams — lot) ──
  var recent = (data.recent) || [];
  var listCard = document.createElement('div');
  listCard.className = 'aui-card';
  listCard.style.marginTop = 'var(--space-4)';
  listCard.style.padding = 'var(--space-3)';

  var listHead = document.createElement('div');
  listHead.className = 'aui-statcard__row';
  listHead.style.marginBottom = 'var(--space-2)';
  listHead.innerHTML =
    '<span class="aui-stat__label">Dispensações recentes</span>' +
    '<span class="aui-badge aui-badge--neutral">' + recent.length + '</span>';
  listCard.appendChild(listHead);

  if (!recent.length) {
    var emptyList = document.createElement('div');
    emptyList.className = 'aui-empty';
    emptyList.style.padding = 'var(--space-3)';
    emptyList.textContent = 'Nenhuma dispensação registrada';
    listCard.appendChild(emptyList);
  } else {
    recent.forEach(function (d) {
      var rowEl = document.createElement('div');
      rowEl.className = 'aui-cardlet';
      rowEl.style.display = 'flex';
      rowEl.style.alignItems = 'center';
      rowEl.style.justifyContent = 'space-between';
      rowEl.style.gap = 'var(--space-3)';

      var dateEl = document.createElement('span');
      dateEl.className = 'aui-cardlet__title';
      dateEl.textContent = fmtBR(d.date);
      rowEl.appendChild(dateEl);

      var rightWrap = document.createElement('div');
      rightWrap.style.display = 'flex';
      rightWrap.style.alignItems = 'center';
      rightWrap.style.gap = 'var(--space-2)';

      var gramsEl = document.createElement('span');
      gramsEl.className = 'aui-stat__delta';
      gramsEl.textContent = d.quantityG + ' g';
      rightWrap.appendChild(gramsEl);

      if (d.lotId) {
        var lotChip = document.createElement('span');
        lotChip.className = 'aui-chip';
        lotChip.textContent = 'lote ' + String(d.lotId).slice(0, 11);
        lotChip.title = d.lotId;
        rightWrap.appendChild(lotChip);
      }

      rowEl.appendChild(rightWrap);
      listCard.appendChild(rowEl);
    });
  }

  root.appendChild(listCard);
}
`;

function html(data: Record<string, unknown>): string {
  const pct = data.pct as number;
  const cap = (data.prescription as { monthlyQuotaG?: number } | undefined)?.monthlyQuotaG ?? 0;
  return htmlShell({
    title: "Cota do Associado",
    categoryLabel: "Membership",
    subtitle: `${data.memberId} · ${data.consumedG}g de ${cap}g (${pct}%) · competência ${data.competencia} · ANVISA RDC 1.014/2026`,
    data,
    bodyHtml: `<div id="member-quota-card"></div>`,
    renderJs: RENDER_JS,
  });
}

export const def: WidgetDef = {
  name: "canna_member_quota_card",
  title: "Cota do Associado",
  description:
    "Cartão de cota mensal de um único associado de uma associação terapêutica de cannabis (ANVISA RDC 1.014/2026). Mostra o id do associado e seu status (badge), o consumo do mês frente ao limite prescrito (g dispensadas / g prescritas) com uma barra de progresso que alerta ao se aproximar (>=80%) ou estourar (>=100%) o limite regulatório, as gramas restantes na cota e uma lista das dispensações recentes (data — gramas — lote). Versão de um membro do scorecard de cotas. Sem PII (LGPD): apenas id do associado e id de lote. Read-model ainda não pronto: dados sintéticos determinísticos para revisão da galeria; o resultado real do tool re-renderiza ao chegar.",
  category: "membership",
  inputShape: {},
  resourceUri: "ui://canna/member-quota-card",
  resourceName: "member-quota-card",
  version: "0.1.0",
  status: "experimental",
  added: "2026-06-10",
  buildData,
  summary,
  html,
  meta: { prefersBorder: true, csp: { connectDomains: ["self"] } },
};
