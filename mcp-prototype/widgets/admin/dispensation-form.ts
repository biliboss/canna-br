/**
 * Registrar Dispensação — dispensation-form (canna-br admin control-center).
 *
 * A Level-3 write-with-approval form (ANVISA RDC 1.014/2026: o dispensador NÃO
 * pode ser o aprovador — segregação RT). Três campos: associado (member ULID),
 * lote (lotId, regra FIFO) e quantidade em gramas (number, step 0.01). Dois
 * botões:
 *   • "Pré-visualizar (draft)"  → tools/call draft_dispensation (read-only).
 *       Quando o host devolve o resultado, o painel de preview é preenchido e o
 *       botão de submit é liberado.
 *   • "Solicitar aprovação"     → tools/call request_record_dispensation, que o
 *       host converte em uma PendingAction para aprovação do RT — NÃO executa a
 *       dispensação imediatamente. Fica desabilitado até existir um preview.
 *
 * Comportamento preservado do app hand-rolled (packages/ui-apps): mesmos nomes
 * de tool, mesmo data-shape de campos ({memberId, lotId, quantityG}), mesmo
 * gate submit-after-preview, mesmo painel que se preenche a partir do
 * ui/notifications/tool-result. Reescrito 100% sobre as primitivas de form do
 * kit (.aui-field / .aui-input / .aui-select / .aui-input-group / .aui-btn) +
 * tokens — sem <style> inline, sem tokens --mcp-app-*.
 *
 * Valores sintéticos pré-preenchidos (associado de exemplo, lote FIFO, 12g)
 * para que o card já apareça populado na galeria. A comunicação com o host usa
 * AuiBridge.callTool; o preview é populado via render(data) (o bridge entrega
 * tanto o __DATA__ baked quanto o tool-result live).
 *
 * LGPD: o formulário trafega apenas o ULID do associado (pseudônimo), nunca PII
 * direta (nome / CPF). O preview ecoa só o que a tool draft devolve.
 */
import { htmlShell } from "../../kit/shell.js";
import { ANCHOR, type WidgetDef } from "../../kit/types.js";

// Synthetic example values so the gallery card looks populated (not empty).
const SAMPLE = {
  memberId: "ASSOC-01J8Z4K2M9",
  lotId: "LOTE-2500",
  quantityG: 12.0,
};

function buildData(args: Record<string, unknown>): Record<string, unknown> {
  const memberId =
    typeof args.memberId === "string" && args.memberId.trim()
      ? args.memberId.trim()
      : SAMPLE.memberId;
  const lotId =
    typeof args.lotId === "string" && args.lotId.trim()
      ? args.lotId.trim()
      : SAMPLE.lotId;
  const quantityG =
    typeof args.quantityG === "number" && Number.isFinite(args.quantityG)
      ? args.quantityG
      : SAMPLE.quantityG;

  // A draft preview is fed by the host (or the gallery self-fire) as `note`/`text`;
  // we surface whatever it sends back from draft_dispensation.
  const note = typeof args.note === "string" ? args.note : null;
  const text = typeof args.text === "string" ? args.text : null;

  return {
    asOf: typeof args.as_of === "string" ? args.as_of : ANCHOR,
    memberId,
    lotId,
    quantityG,
    note,
    text,
  };
}

function summary(data: Record<string, unknown>): string {
  return (
    `Registrar Dispensação (nível 3, RDC 1.014): associado ${data.memberId}, ` +
    `lote ${data.lotId} (FIFO), ${data.quantityG}g. ` +
    `Pré-visualizar gera um rascunho (draft_dispensation, somente leitura); ` +
    `solicitar aprovação cria uma PendingAction para o RT aprovar ` +
    `(dispensador ≠ aprovador) — não executa a dispensação na hora.`
  );
}

const RENDER_JS = `
function render(data) {
  data = data || {};

  // ── element handles (built once in bodyHtml; render() only updates state) ──
  var memberEl = document.getElementById('memberId');
  var lotEl = document.getElementById('lotId');
  var qtyEl = document.getElementById('quantityG');
  var previewBtn = document.getElementById('previewBtn');
  var submitBtn = document.getElementById('submitBtn');
  var previewPane = document.getElementById('preview');
  var previewWrap = document.getElementById('previewWrap');
  if (!memberEl || !lotEl || !qtyEl || !previewBtn || !submitBtn) return;

  // ── pre-fill fields from baked/live data (idempotent: only when present) ──
  if (typeof data.memberId === 'string' && data.memberId) memberEl.value = data.memberId;
  if (typeof data.lotId === 'string' && data.lotId) lotEl.value = data.lotId;
  if (typeof data.quantityG === 'number' && isFinite(data.quantityG)) qtyEl.value = String(data.quantityG);

  // ── if a draft preview arrived, fill the pane + unlock submit ──
  var previewText = (typeof data.text === 'string' && data.text)
    ? data.text
    : (typeof data.note === 'string' && data.note ? data.note : null);
  if (previewText) {
    if (previewPane) previewPane.textContent = previewText;
    if (previewWrap) previewWrap.hidden = false;
    submitBtn.disabled = false;
  }

  // ── wire actions once (guard against re-render double-binding) ──
  if (previewBtn.dataset.wired === '1') return;
  previewBtn.dataset.wired = '1';

  function collect() {
    return {
      memberId: (memberEl.value || '').trim(),
      lotId: (lotEl.value || '').trim(),
      quantityG: Number(qtyEl.value)
    };
  }

  function call(name, args) {
    try {
      if (window.AuiBridge && typeof window.AuiBridge.callTool === 'function') {
        return window.AuiBridge.callTool(name, args);
      }
    } catch (e) { /* no host in raw preview */ }
    return null;
  }

  previewBtn.addEventListener('click', function () {
    var btn = previewBtn;
    btn.classList.add('is-loading');
    var p = call('draft_dispensation', collect());
    var done = function () { btn.classList.remove('is-loading'); };
    if (p && typeof p.then === 'function') { p.then(done, done); }
    else { done(); }
  });

  submitBtn.addEventListener('click', function () {
    if (submitBtn.disabled) return;
    var btn = submitBtn;
    btn.classList.add('is-loading');
    var p = call('request_record_dispensation', collect());
    var done = function () {
      btn.classList.remove('is-loading');
      btn.textContent = 'Aprovação solicitada ✓';
      btn.disabled = true;
    };
    if (p && typeof p.then === 'function') { p.then(done, done); }
    else { done(); }
  });
}
`;

const BODY_HTML = `
<form class="aui-form" id="dispensation-form" autocomplete="off" novalidate
      style="max-width:440px;margin:0 auto;">

  <div class="aui-field aui-field--required">
    <label class="aui-field__label" for="memberId">Associado (ULID)</label>
    <input class="aui-input" id="memberId" name="memberId" type="text"
           inputmode="text" autocomplete="off"
           placeholder="ASSOC-…" aria-describedby="memberId-help" />
    <span class="aui-field__help" id="memberId-help">Identificador pseudônimo do associado — sem nome/CPF (LGPD).</span>
  </div>

  <div class="aui-field aui-field--required">
    <label class="aui-field__label" for="lotId">Lote (FIFO)</label>
    <input class="aui-input" id="lotId" name="lotId" type="text"
           autocomplete="off"
           placeholder="LOTE-…" aria-describedby="lotId-help" />
    <span class="aui-field__help" id="lotId-help">Lote liberado com vencimento mais próximo (regra FIFO).</span>
  </div>

  <div class="aui-field aui-field--required">
    <label class="aui-field__label" for="quantityG">Quantidade</label>
    <div class="aui-input-group">
      <input class="aui-input" id="quantityG" name="quantityG" type="number"
             step="0.01" min="0.01" inputmode="decimal"
             placeholder="0,00" aria-describedby="quantityG-help" />
      <span class="aui-input-group__addon">g</span>
    </div>
    <span class="aui-field__help" id="quantityG-help">Gramas a dispensar (passo de 0,01g).</span>
  </div>

  <div class="aui-form-actions aui-form-actions--spread">
    <button class="aui-btn aui-btn--ghost" id="previewBtn" type="button"
            title="Gera um rascunho somente-leitura (draft_dispensation)">
      Pré-visualizar (draft)
    </button>
    <button class="aui-btn aui-btn--primary" id="submitBtn" type="button" disabled
            title="Cria uma PendingAction para o RT aprovar — não executa a dispensação">
      Solicitar aprovação
    </button>
  </div>

  <aside class="aui-alert aui-alert--info" role="note">
    <span class="aui-alert__icon" aria-hidden="true">ℹ︎</span>
    <div class="aui-alert__body">
      <div class="aui-alert__title">Nível 3 — aprovação obrigatória</div>
      <p class="aui-alert__desc">
        Pela RDC 1.014/2026 o dispensador não pode ser o aprovador. Solicitar aprovação
        cria uma <strong>PendingAction</strong> para o Responsável Técnico (RT) revisar —
        a dispensação <strong>não é executada</strong> no envio.
      </p>
    </div>
  </aside>

  <div class="aui-field" id="previewWrap" hidden>
    <span class="aui-field__label">Pré-visualização (draft)</span>
    <pre class="aui-card" id="preview"
         style="margin:0;padding:var(--space-3);white-space:pre-wrap;word-break:break-word;font-family:var(--font-mono,ui-monospace,monospace);font-size:var(--text-xs);color:var(--muted-foreground);line-height:1.5;"></pre>
  </div>

</form>
`;

function html(data: Record<string, unknown>): string {
  return htmlShell({
    title: "Registrar Dispensação",
    categoryLabel: "Dispensação",
    subtitle: `Fluxo nível 3 (RDC 1.014) — dispensador ≠ aprovador · pré-visualize um rascunho e solicite a aprovação do RT · em ${data.asOf}`,
    data,
    bodyHtml: BODY_HTML,
    renderJs: RENDER_JS,
    forms: true,
  });
}

export const def: WidgetDef = {
  name: "canna_dispensation_form",
  title: "Registrar Dispensação",
  description:
    "Formulário de dispensação de extrato de cannabis para associados terapêuticos (ANVISA RDC 1.014/2026), fluxo de escrita com aprovação (nível 3). Três campos: associado (member ULID, pseudônimo — sem PII), lote (regra FIFO) e quantidade em gramas (passo 0,01). 'Pré-visualizar' chama draft_dispensation (somente leitura) e preenche um painel de rascunho; 'Solicitar aprovação' (liberado só após o preview) chama request_record_dispensation, que o host converte em uma PendingAction para o Responsável Técnico (RT) aprovar — o dispensador não pode ser o aprovador e a dispensação NÃO é executada no envio. Construído sobre as primitivas de form do kit. Valores sintéticos pré-preenchidos para revisão da galeria.",
  category: "dispensation",
  inputShape: {},
  resourceUri: "ui://canna/dispensation-form",
  resourceName: "dispensation-form",
  version: "0.1.0",
  status: "experimental",
  added: "2026-06-10",
  buildData,
  summary,
  html,
  meta: { prefersBorder: true, csp: { connectDomains: ["self"] } },
};
