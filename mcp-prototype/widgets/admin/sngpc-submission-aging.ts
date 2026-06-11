/**
 * Fila SNGPC — Envelhecimento de Submissões.
 *
 * SNGPC (Sistema Nacional de Gerenciamento de Produtos Controlados / ANVISA)
 * exige a escrituração da dispensação no MESMO DIA ÚTIL. Este painel admin
 * (DIRETORIA / RT / DPO) ranqueia os jobs de submissão pendentes por idade
 * (ageHours desc) — quanto mais velho o job, maior o risco regulatório.
 *
 * Cada linha = um job de escrituração travado: id da dispensação, associado
 * (apenas iniciais + sufixo de hash de CPF — LGPD, nunca nome/CPF completo),
 * SKU do lote, gramas dispensadas, idade em horas, estado da fila e tentativa.
 * Uma barra fina (.aui-progress) mostra ageHours contra o limite de 120h; acima
 * disso a barra fica --over. Risco: >120h → bloqueado, >48h → em risco, else ok.
 *
 * Ação por linha: "Reenviar SNGPC" dispara AuiBridge.sendMessage para o agente
 * re-tentar a submissão (request_record_dispensation) daquele job.
 *
 * Sem ECharts — só barras de progresso do kit (DOM puro + tokens).
 */
import { htmlShell } from "../../kit/shell.js";
import {
  mulberry32,
  randInt,
  pick,
  ANCHOR,
  type WidgetDef,
} from "../../kit/types.js";

// SNGPC threshold: ANVISA exige escrituração no mesmo dia útil. 120h (5 dias
// corridos) é o ponto de bloqueio regulatório; 48h já é zona de risco.
const RISK_BLOCK_H = 120;
const RISK_WARN_H = 48;

// Aliases de associados — iniciais (LGPD). Nunca nome completo.
const MEMBER_ALIASES = [
  "A. S. Oliveira",
  "M. R. Costa",
  "J. P. Almeida",
  "C. F. Souza",
  "R. L. Pereira",
  "B. T. Nogueira",
  "L. M. Ribeiro",
  "F. A. Carvalho",
  "D. S. Moraes",
  "P. H. Lima",
] as const;

// SKUs de lote de extrato/isolado (CBD/CBG/THC full-spectrum), padrão interno.
const SKUS = [
  "CBD-ISO-30-001",
  "CBD-FS-20-014",
  "CBD-ISO-50-007",
  "CBG-FS-15-003",
  "THC-FS-05-011",
  "CBD-FS-100-002",
  "CBD-ISO-30-022",
  "CBD-FS-20-009",
] as const;

// Estados da fila de submissão SNGPC.
const STATUSES = [
  "PENDING",
  "PENDING",
  "PENDING",
  "RETRY_1",
  "RETRY_1",
  "RETRY_2",
  "FAILED",
  "FAILED",
] as const;

interface AgingJob {
  jobId: string;
  dispensationId: string;
  memberAlias: string;
  cpfHash: string;
  sku: string;
  quantityG: number;
  ageHours: number;
  status: string;
  attempt: number;
}

// Sufixo de hash de CPF (4 hex) — identificador estável e LGPD-safe.
function cpfHashSuffix(rng: () => number): string {
  const hex = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < 4; i++) s += hex[Math.floor(rng() * 16)]!;
  return s;
}

function riskBand(ageHours: number): "blocked" | "at-risk" | "on-track" {
  if (ageHours > RISK_BLOCK_H) return "blocked";
  if (ageHours > RISK_WARN_H) return "at-risk";
  return "on-track";
}

function buildData(args: Record<string, unknown>): Record<string, unknown> {
  const asOf = typeof args.as_of === "string" ? args.as_of : ANCHOR;
  const rng = mulberry32(8305);

  const n = 8;
  const jobs: AgingJob[] = [];
  let jobSeq = 4120;
  let dispSeq = 90710;
  for (let i = 0; i < n; i++) {
    const status = pick(rng, STATUSES);
    // FAILED/RETRY jobs envelhecem mais (já circularam pela fila).
    const base =
      status === "FAILED" ? randInt(rng, 96, 168)
      : status === "RETRY_2" ? randInt(rng, 54, 132)
      : status === "RETRY_1" ? randInt(rng, 30, 84)
      : randInt(rng, 4, 60);
    const ageHours = Math.min(180, base);
    const attempt =
      status === "FAILED" ? randInt(rng, 3, 4)
      : status === "RETRY_2" ? 3
      : status === "RETRY_1" ? 2
      : 1;
    jobs.push({
      jobId: "SNGPC-" + ++jobSeq,
      dispensationId: "DISP-" + ++dispSeq,
      memberAlias: MEMBER_ALIASES[i % MEMBER_ALIASES.length]!,
      cpfHash: cpfHashSuffix(rng),
      sku: pick(rng, SKUS),
      quantityG: randInt(rng, 5, 60),
      ageHours,
      status,
      attempt,
    });
  }

  // Rank por idade desc — o job mais velho lidera a fila de risco.
  jobs.sort((a, b) => b.ageHours - a.ageHours);

  const falhando = jobs.filter((j) => riskBand(j.ageHours) === "blocked").length;
  const emRisco = jobs.filter((j) => riskBand(j.ageHours) === "at-risk").length;
  const ok = jobs.filter((j) => riskBand(j.ageHours) === "on-track").length;

  return {
    asOf,
    threshold: RISK_BLOCK_H,
    warnAt: RISK_WARN_H,
    jobs,
    total: jobs.length,
    falhando,
    emRisco,
    ok,
  };
}

function summary(data: Record<string, unknown>): string {
  const total = data.total as number;
  const falhando = data.falhando as number;
  const emRisco = data.emRisco as number;
  const jobs = data.jobs as AgingJob[];
  const oldest = jobs[0];
  return (
    `Fila SNGPC: ${total} submissões pendentes (até ${data.asOf}); ` +
    `${falhando} bloqueadas (>${RISK_BLOCK_H}h), ${emRisco} em risco (>${RISK_WARN_H}h). ` +
    (oldest
      ? `Mais antiga: ${oldest.dispensationId} (${oldest.memberAlias}, ${oldest.ageHours}h, ${oldest.status}). `
      : "") +
    `ANVISA exige escrituração no mesmo dia útil.`
  );
}

const RENDER_JS = `
function render(data) {
  var root = document.getElementById('aui-body');
  while (root.firstChild) root.removeChild(root.firstChild);

  var jobs = (data.jobs || []).slice();
  var threshold = data.threshold || 120;
  var warnAt = data.warnAt || 48;

  function riskBand(h) {
    if (h > threshold) return 'blocked';
    if (h > warnAt) return 'at-risk';
    return 'on-track';
  }
  function riskLabel(b) {
    return b === 'blocked' ? 'BLOQUEADO' : b === 'at-risk' ? 'EM RISCO' : 'NO PRAZO';
  }

  // ── KPI strip ──────────────────────────────────────────────────────────────
  var kpis = document.createElement('div');
  kpis.className = 'aui-kpis';
  kpis.id = 'sngpcKpis';
  var cards = [
    { label: 'Submissões', value: data.total || jobs.length, cls: '' },
    { label: 'Falhando', value: data.falhando || 0, cls: 'aui-badge--blocked' },
    { label: 'Em risco', value: data.emRisco || 0, cls: 'aui-badge--at-risk' },
    { label: 'No prazo', value: data.ok || 0, cls: 'aui-badge--on-track' }
  ];
  cards.forEach(function (c) {
    var card = document.createElement('div');
    card.className = 'aui-statcard';
    var stat = document.createElement('div');
    stat.className = 'aui-stat';
    var lab = document.createElement('span');
    lab.className = 'aui-stat__label';
    lab.textContent = c.label;
    var val = document.createElement('span');
    val.className = 'aui-stat__value';
    val.textContent = String(c.value);
    if (c.cls) {
      var dot = document.createElement('span');
      dot.className = 'aui-badge ' + c.cls;
      dot.innerHTML = '&nbsp;';
      dot.style.marginLeft = '6px';
      dot.style.verticalAlign = 'middle';
      val.appendChild(dot);
    }
    stat.appendChild(lab);
    stat.appendChild(val);
    card.appendChild(stat);
    kpis.appendChild(card);
  });
  root.appendChild(kpis);

  // ── caption ────────────────────────────────────────────────────────────────
  var cap = document.createElement('p');
  cap.className = 'sngpc-cap';
  cap.textContent = 'ANVISA exige escrituração no mesmo dia útil — limite de bloqueio ' +
    threshold + 'h. Ranqueado por idade.';
  root.appendChild(cap);

  // ── ranked aging list ──────────────────────────────────────────────────────
  var list = document.createElement('div');
  list.className = 'sngpc-list';
  list.id = 'sngpcList';

  jobs.forEach(function (j) {
    var band = riskBand(j.ageHours);
    var pct = Math.min(100, Math.round((j.ageHours / threshold) * 100));
    var over = j.ageHours > threshold;

    var row = document.createElement('div');
    row.className = 'sngpc-row';

    // line 1: identity + chips + age + badges
    var head = document.createElement('div');
    head.className = 'sngpc-row__head';

    var id = document.createElement('span');
    id.className = 'sngpc-row__id';
    id.textContent = j.dispensationId;

    var who = document.createElement('span');
    who.className = 'sngpc-row__who';
    who.textContent = j.memberAlias + ' \\u00b7 #' + j.cpfHash;

    var skuChip = document.createElement('span');
    skuChip.className = 'aui-chip';
    skuChip.textContent = j.sku;

    var qtyChip = document.createElement('span');
    qtyChip.className = 'aui-chip';
    qtyChip.textContent = j.quantityG + 'g';

    var age = document.createElement('span');
    age.className = 'sngpc-row__age';
    age.textContent = 'Há ' + j.ageHours + 'h';

    var statusBadge = document.createElement('span');
    statusBadge.className = 'aui-badge aui-badge--neutral';
    statusBadge.textContent = j.status + (j.attempt > 1 ? ' \\u00b7 t' + j.attempt : '');

    var riskBadge = document.createElement('span');
    riskBadge.className = 'aui-badge aui-badge--' + band;
    riskBadge.textContent = riskLabel(band);

    head.appendChild(id);
    head.appendChild(who);
    head.appendChild(skuChip);
    head.appendChild(qtyChip);
    head.appendChild(age);
    head.appendChild(statusBadge);
    head.appendChild(riskBadge);

    // line 2: progress bar (ageHours vs threshold) + action
    var foot = document.createElement('div');
    foot.className = 'sngpc-row__foot';

    var prog = document.createElement('div');
    prog.className = 'aui-progress' + (over ? ' aui-progress--over' : '');
    prog.title = j.ageHours + 'h de ' + threshold + 'h (' + pct + '%)';
    var bar = document.createElement('div');
    bar.className = 'aui-progress__bar';
    bar.style.width = pct + '%';
    if (!over) {
      bar.style.background = band === 'at-risk'
        ? 'var(--at-risk)'
        : 'var(--on-track)';
    }
    prog.appendChild(bar);

    var btn = document.createElement('button');
    btn.className = 'aui-btn aui-btn--sm';
    btn.type = 'button';
    btn.textContent = 'Reenviar SNGPC';
    btn.addEventListener('click', function () {
      try {
        if (window.AuiBridge && AuiBridge.sendMessage) {
          AuiBridge.sendMessage('Reenviar SNGPC ' + j.jobId);
        }
        toast('Reenvio solicitado: ' + j.jobId);
      } catch (e) {
        toast('Falha ao solicitar reenvio');
      }
    });

    foot.appendChild(prog);
    foot.appendChild(btn);

    row.appendChild(head);
    row.appendChild(foot);
    list.appendChild(row);
  });

  root.appendChild(list);

  // ── lightweight toast (no kit dependency, tokens only) ─────────────────────
  function toast(msg) {
    var prev = document.getElementById('sngpcToast');
    if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
    var t = document.createElement('div');
    t.id = 'sngpcToast';
    t.className = 'sngpc-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () {
      try { if (t.parentNode) t.parentNode.removeChild(t); } catch (e) {}
    }, 2600);
  }
}
`;

function html(data: Record<string, unknown>): string {
  const total = data.total as number;
  const falhando = data.falhando as number;
  const emRisco = data.emRisco as number;
  return htmlShell({
    title: "Fila SNGPC — Envelhecimento de Submissões",
    categoryLabel: "Compliance",
    subtitle: `${total} submissões pendentes · ${falhando} bloqueadas / ${emRisco} em risco · escrituração no mesmo dia útil (ANVISA) · até ${data.asOf}`,
    data,
    wide: true,
    bodyHtml: `<div class="aui-kpis" id="sngpcKpis"></div><p class="sngpc-cap"></p><div class="sngpc-list" id="sngpcList"></div>`,
    renderJs: RENDER_JS,
    extraCss: `
#sngpcKpis { margin-bottom: 10px; }
.sngpc-cap {
  margin: 0 0 12px;
  color: var(--muted-foreground);
  font-size: var(--text-xs);
}
.sngpc-list { display: flex; flex-direction: column; gap: 8px; }
.sngpc-row {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: var(--shadow);
}
.sngpc-row__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.sngpc-row__id {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--foreground);
}
.sngpc-row__who {
  font-size: var(--text-xs);
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}
.sngpc-row__age {
  margin-left: auto;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--foreground);
  font-variant-numeric: tabular-nums;
}
.sngpc-row__foot {
  display: flex;
  align-items: center;
  gap: 12px;
}
.sngpc-row__foot .aui-progress { flex: 1; min-width: 0; }
.sngpc-row__foot .aui-btn { flex-shrink: 0; }
.sngpc-toast {
  position: fixed;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 14px;
  font-size: var(--text-xs);
  box-shadow: var(--shadow-lg);
  z-index: 9999;
}
`,
  });
}

export const def: WidgetDef = {
  name: "canna_sngpc_aging",
  title: "Fila SNGPC — Envelhecimento de Submissões",
  description:
    "Fila SNGPC — Envelhecimento de Submissões: painel admin (DIRETORIA / RT / DPO) que ranqueia os jobs de escrituração SNGPC pendentes por idade (horas), do mais antigo ao mais novo. A ANVISA exige escrituração da dispensação no MESMO DIA ÚTIL, então submissões >120h são bloqueadas (risco regulatório), >48h em risco. Cada linha mostra a dispensação, o associado (iniciais + sufixo de hash de CPF — LGPD, nunca nome/CPF completo), SKU do lote, gramas, idade, estado da fila (PENDING/RETRY_1/RETRY_2/FAILED) e uma barra de progresso ageHours vs limite de 120h. Botão por linha reenvia a submissão ao SNGPC. Dados sintéticos quando sem argumentos.",
  category: "compliance",
  inputShape: {},
  resourceUri: "ui://canna/sngpc-submission-aging",
  resourceName: "sngpc-submission-aging",
  version: "0.1.0",
  status: "experimental",
  added: "2026-06-10",
  buildData,
  summary,
  html,
  meta: { prefersBorder: true, csp: { connectDomains: ["self"] } },
};
