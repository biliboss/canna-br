/**
 * Painel de Membros — Ciclo de Vida (canna-br ADMIN MCP-App).
 *
 * Kanban board (DOM, no SVG) over the Member lifecycle of a Brazilian cannabis
 * therapeutic association (ANVISA RDC 1.014/2026). Columns = MemberStatus in
 * lifecycle order: Aguardando Consentimento → Ativo → Suspenso →
 * Consentimento Revogado → Anonimizado. Each column carries an optional WIP
 * limit; PENDING_CONSENT is the intake gate (wip 5) and flags .over when the
 * consent queue backs up.
 *
 * LGPD: associates are NEVER shown by full name or CPF. Cards display only
 * initials (alias "A. S. Oliveira") + a 6-hex CPF-hash suffix chip. The board
 * surfaces governance signals only — consent ageing, suspension reasons —
 * not personal data. Clicking a card asks the assistant for that associate's
 * detail via AuiBridge.sendMessage. Synthetic, deterministic data (seed 8301).
 *
 * Reuses the mcp-app-base kit: .aui-board > .aui-col > .aui-cardlet painted via
 * tokens; status LABELS = .aui-badge--* atoms; cos = left accent + badge.
 */
import { htmlShell } from "../../kit/shell.js";
import { mulberry32, randInt, pick, type WidgetDef } from "../../kit/types.js";

interface Column {
  key: string;
  title: string;
  wipLimit: number | null;
}

type Cos = "expedite" | "standard" | "fixed-date";

interface Card {
  id: string;
  alias: string;
  cpfSuffix: string;
  status: string;
  daysInStatus: number;
  cos: Cos;
  reason?: string;
  blocked?: boolean;
  blockReason?: string;
}

// Lifecycle columns — MemberStatus in order. PENDING_CONSENT is the intake gate.
const COLUMNS: Column[] = [
  { key: "PENDING_CONSENT", title: "Aguardando Consentimento", wipLimit: 5 },
  { key: "ACTIVE", title: "Ativo", wipLimit: null },
  { key: "SUSPENDED", title: "Suspenso", wipLimit: null },
  { key: "CONSENT_REVOKED", title: "Consentimento Revogado", wipLimit: null },
  { key: "ANONYMIZED", title: "Anonimizado", wipLimit: null },
];

const CONSENT_EXPEDITE_DAYS = 21; // PENDING_CONSENT older than this → expedite

// Initials-only aliases (LGPD: never full names). Drawn deterministically.
const ALIASES = [
  "A. S. Oliveira",
  "M. R. Souza",
  "J. P. Almeida",
  "C. F. Lima",
  "R. T. Santos",
  "L. M. Costa",
  "B. A. Pereira",
  "F. G. Rodrigues",
  "D. C. Carvalho",
  "P. H. Nunes",
  "T. E. Barbosa",
  "G. V. Ribeiro",
  "N. O. Cardoso",
  "S. L. Moraes",
  "V. D. Teixeira",
  "E. B. Fonseca",
  "H. M. Araújo",
  "I. R. Macedo",
];

// Suspension reasons (RT / DPO governance). Used on SUSPENDED cards.
const SUSPEND_REASONS = [
  "Prescrição expirada",
  "Quota mensal excedida",
  "Pendência documental (RT)",
  "Revisão de laudo médico",
];

// Revocation reasons (LGPD Art. 8 §5 — consent withdrawal).
const REVOKE_REASONS = [
  "Solicitação do titular",
  "Vínculo encerrado",
];

const HEX = "0123456789abcdef";

function cpfHashSuffix(rng: () => number): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += HEX[Math.floor(rng() * 16)];
  return s;
}

function buildData(_args: Record<string, unknown>): Record<string, unknown> {
  const rng = mulberry32(8301);

  // ~16 cards across the lifecycle. PENDING_CONSENT intentionally over WIP (5→6)
  // to surface the consent-queue backlog signal.
  const distribution: Record<string, number> = {
    PENDING_CONSENT: 6, // over WIP limit of 5
    ACTIVE: 5,
    SUSPENDED: 3,
    CONSENT_REVOKED: 1,
    ANONYMIZED: 1,
  };

  const aliases = [...ALIASES];
  // Fisher–Yates with the deterministic rng so aliases are stable.
  for (let i = aliases.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    const tmp = aliases[i]!;
    aliases[i] = aliases[j]!;
    aliases[j] = tmp;
  }

  const cards: Card[] = [];
  let n = 0;
  let aliasIdx = 0;
  for (const col of COLUMNS) {
    const count = distribution[col.key] ?? 0;
    for (let i = 0; i < count; i++) {
      const alias = aliases[aliasIdx % aliases.length]!;
      const cpfSuffix = cpfHashSuffix(rng);

      // Age in current status — varies by lifecycle stage.
      let daysInStatus: number;
      if (col.key === "PENDING_CONSENT") daysInStatus = randInt(rng, 2, 34);
      else if (col.key === "ACTIVE") daysInStatus = randInt(rng, 6, 210);
      else if (col.key === "SUSPENDED") daysInStatus = randInt(rng, 3, 48);
      else if (col.key === "CONSENT_REVOKED") daysInStatus = randInt(rng, 5, 90);
      else daysInStatus = randInt(rng, 30, 365); // ANONYMIZED

      // Class of service:
      //  - PENDING_CONSENT > 21 days → expedite (consent SLA breached)
      //  - CONSENT_REVOKED → fixed-date (anonymization deadline)
      //  - else standard
      let cos: Cos = "standard";
      if (col.key === "PENDING_CONSENT" && daysInStatus > CONSENT_EXPEDITE_DAYS) {
        cos = "expedite";
      } else if (col.key === "CONSENT_REVOKED") {
        cos = "fixed-date";
      }

      // SUSPENDED carries a reason and is treated as blocked (RT gate).
      let reason: string | undefined;
      let blocked = false;
      let blockReason: string | undefined;
      if (col.key === "SUSPENDED") {
        reason = pick(rng, SUSPEND_REASONS);
        blocked = true;
        blockReason = reason;
      } else if (col.key === "CONSENT_REVOKED") {
        reason = pick(rng, REVOKE_REASONS);
      }

      cards.push({
        id: "MBR-" + String(2400 + n),
        alias,
        cpfSuffix,
        status: col.key,
        daysInStatus,
        cos,
        ...(reason ? { reason } : {}),
        ...(blocked ? { blocked: true, blockReason } : {}),
      });
      n++;
      aliasIdx++;
    }
  }

  const counts: Record<string, number> = {};
  for (const col of COLUMNS) counts[col.key] = 0;
  for (const c of cards) counts[c.status] = (counts[c.status] ?? 0) + 1;

  const blockedCount = cards.filter((c) => c.blocked).length;
  const expediteCount = cards.filter((c) => c.cos === "expedite").length;
  const overCols = COLUMNS.filter(
    (col) => col.wipLimit != null && (counts[col.key] ?? 0) > col.wipLimit,
  ).map((col) => ({
    key: col.key,
    title: col.title,
    count: counts[col.key] ?? 0,
    limit: col.wipLimit as number,
  }));

  return {
    columns: COLUMNS,
    cards,
    counts,
    total: cards.length,
    blockedCount,
    expediteCount,
    overCols,
    consentExpediteDays: CONSENT_EXPEDITE_DAYS,
  };
}

function summary(data: Record<string, unknown>): string {
  const columns = data.columns as Column[];
  const counts = data.counts as Record<string, number>;
  const overCols = data.overCols as {
    title: string;
    count: number;
    limit: number;
  }[];
  const over =
    overCols.length > 0
      ? overCols
          .map((o) => `${o.title} acima do limite de fila (${o.count}/${o.limit})`)
          .join(", ")
      : "fila de consentimento dentro do limite";
  return (
    `Painel de Membros — Ciclo de Vida: ${data.total} associados em ` +
    `${columns.length} estados (Aguardando ${counts.PENDING_CONSENT ?? 0} · ` +
    `Ativo ${counts.ACTIVE ?? 0} · Suspenso ${counts.SUSPENDED ?? 0} · ` +
    `Revogado ${counts.CONSENT_REVOKED ?? 0} · Anonimizado ${counts.ANONYMIZED ?? 0}); ` +
    `${over}; ${data.blockedCount} suspensos (RT) e ${data.expediteCount} consentimentos ` +
    `fora do SLA. Dados sintéticos — associados em iniciais + hash de CPF (LGPD).`
  );
}

const RENDER_JS = `
function render(data) {
  var root = document.getElementById('aui-body');
  root.innerHTML = '';

  var columns = data.columns || [];
  var cards = data.cards || [];
  var counts = data.counts || {};

  var COS_LABEL = {
    'expedite': 'Fora do SLA',
    'fixed-date': 'Prazo legal',
    'standard': 'Padrão'
  };

  // MemberStatus → status badge atom (label = governance state, never raw data).
  var STATUS_BADGE = {
    'PENDING_CONSENT': 'at-risk',
    'ACTIVE': 'on-track',
    'SUSPENDED': 'blocked',
    'CONSENT_REVOKED': 'destructive',
    'ANONYMIZED': 'neutral'
  };
  var STATUS_LABEL = {
    'PENDING_CONSENT': 'Aguardando',
    'ACTIVE': 'Ativo',
    'SUSPENDED': 'Suspenso',
    'CONSENT_REVOKED': 'Revogado',
    'ANONYMIZED': 'Anonimizado'
  };

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
    countEl.textContent = (col.wipLimit != null)
      ? (count + '/' + col.wipLimit)
      : String(count);
    if (over) {
      countEl.title = 'Fila de consentimento acima do limite (' + count + '/' + col.wipLimit + ')';
    }

    head.appendChild(title);
    head.appendChild(countEl);
    colEl.appendChild(head);

    // ── cards in this column ──
    cards.filter(function (c) { return c.status === col.key; }).forEach(function (c) {
      var cardEl = document.createElement('div');
      cardEl.className = 'aui-cardlet cos-' + c.cos + (c.blocked ? ' blocked' : '');
      cardEl.setAttribute('role', 'button');
      cardEl.setAttribute('tabindex', '0');
      cardEl.setAttribute('data-id', c.id);

      // alias (initials only — LGPD)
      var titleEl = document.createElement('div');
      titleEl.className = 'aui-cardlet__title';
      titleEl.textContent = c.alias;
      cardEl.appendChild(titleEl);

      var meta = document.createElement('div');
      meta.className = 'aui-cardlet__meta';

      // status label (atom) — governance state
      var statusBadge = document.createElement('span');
      var mod = STATUS_BADGE[c.status] || 'neutral';
      statusBadge.className = 'aui-badge aui-badge--' + mod;
      statusBadge.textContent = STATUS_LABEL[c.status] || c.status;
      meta.appendChild(statusBadge);

      // class-of-service badge (atom)
      var cosBadge = document.createElement('span');
      cosBadge.className = 'aui-badge aui-badge--' + c.cos;
      cosBadge.textContent = COS_LABEL[c.cos] || c.cos;
      meta.appendChild(cosBadge);

      // CPF-hash suffix chip (LGPD pseudonym — never the real CPF)
      var cpfChip = document.createElement('span');
      cpfChip.className = 'aui-chip';
      cpfChip.textContent = 'CPF#' + c.cpfSuffix;
      cpfChip.title = 'Sufixo de hash do CPF (pseudônimo LGPD)';
      meta.appendChild(cpfChip);

      // days-in-status chip
      var daysChip = document.createElement('span');
      daysChip.className = 'aui-chip';
      daysChip.textContent = 'Há ' + c.daysInStatus + ' dias';
      daysChip.title = 'Tempo no estado atual: ' + c.daysInStatus + ' dia' + (c.daysInStatus === 1 ? '' : 's');
      meta.appendChild(daysChip);

      // blocked badge with reason (atom) — suspension gate
      if (c.blocked) {
        var blkBadge = document.createElement('span');
        blkBadge.className = 'aui-badge aui-badge--blocked';
        blkBadge.textContent = 'Bloqueado' + (c.blockReason ? ' · ' + c.blockReason : '');
        if (c.blockReason) blkBadge.title = 'Motivo da suspensão (RT): ' + c.blockReason;
        meta.appendChild(blkBadge);
      } else if (c.reason) {
        // non-blocking reason (e.g. revocation cause)
        var reasonChip = document.createElement('span');
        reasonChip.className = 'aui-chip';
        reasonChip.textContent = c.reason;
        meta.appendChild(reasonChip);
      }

      cardEl.appendChild(meta);

      // ── interaction: ask the assistant for this associate's detail ──
      var ask = function () {
        try {
          if (window.AuiBridge && typeof window.AuiBridge.sendMessage === 'function') {
            window.AuiBridge.sendMessage('Detalhe do associado ' + c.id);
          }
        } catch (e) { /* AuiBridge may be absent in raw preview */ }
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
      empty.textContent = 'Vazio';
      colEl.appendChild(empty);
    }

    board.appendChild(colEl);
  });

  root.appendChild(board);

  // ── legend / class-of-service key ──
  var legend = document.createElement('div');
  legend.className = 'aui-legend';
  var cosKey = [
    { cls: '--cos-standard', label: 'Padrão' },
    { cls: '--cos-expedite', label: 'Consentimento fora do SLA (>21 dias)' },
    { cls: '--cos-fixed-date', label: 'Prazo legal de anonimização' },
    { cls: '--blocked', label: 'Suspenso (gate RT)' }
  ];
  cosKey.forEach(function (k) {
    var it = document.createElement('span');
    it.className = 'aui-legend__item';
    it.innerHTML = '<span class="aui-legend__swatch" style="background:var(' + k.cls + ')"></span>' + k.label;
    legend.appendChild(it);
  });
  root.appendChild(legend);
}
`;

function html(data: Record<string, unknown>): string {
  const counts = data.counts as Record<string, number>;
  return htmlShell({
    title: "Painel de Membros — Ciclo de Vida",
    categoryLabel: "Associados",
    subtitle:
      `${data.total} associados · ${counts.PENDING_CONSENT ?? 0} aguardando consentimento · ` +
      `${data.blockedCount} suspensos · iniciais + hash CPF (LGPD) · clique para detalhe`,
    data,
    bodyHtml: `<div class="aui-board" id="board"></div>`,
    renderJs: RENDER_JS,
    wide: true,
  });
}

export const def: WidgetDef = {
  name: "canna_member_board",
  title: "Painel de Membros — Ciclo de Vida",
  description:
    "Painel administrativo (DIRETORIA/RT/DPO) do ciclo de vida de associados de uma associação terapêutica de cannabis (ANVISA RDC 1.014/2026). Kanban por MemberStatus — Aguardando Consentimento → Ativo → Suspenso → Consentimento Revogado → Anonimizado — com limite de fila na intake de consentimento (destacado quando excedido). Cada card mostra o estado, classe de serviço (consentimento fora do SLA de 21 dias, prazo legal de anonimização), tempo no estado e motivo de suspensão/revogação. LGPD: associados aparecem só por iniciais + sufixo de hash do CPF, nunca nome ou CPF completos. Clicar um card pede o detalhe daquele associado. Dados sintéticos quando sem argumentos.",
  category: "membership",
  inputShape: {},
  resourceUri: "ui://canna/member-lifecycle-board",
  resourceName: "member-lifecycle-board",
  version: "0.1.0",
  status: "experimental",
  added: "2026-06-10",
  buildData,
  summary,
  html,
  meta: { prefersBorder: true, csp: { connectDomains: ["self"] } },
};
