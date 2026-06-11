/**
 * Cadastrar membro — member-registration (canna-br admin control-center).
 *
 * The "natural language → pre-filled form → confirm" widget. The user types in
 * chat ("Cadastrar Fulano de Tal, CPF x, nascido em y, prescrição z"), the agent
 * extracts the fields and opens THIS form ALREADY POPULATED. The human's only job
 * is to review what the agent extracted and confirm (or fix any field — every
 * input stays editable). There is no blank-state entry: the card always renders
 * with values so the demo shows the populated flow.
 *
 * Sete campos, todos pré-preenchidos a partir de buildData (baked) ou do
 * tool-result live (extração do agente): nome completo, CPF (com nota LGPD — é
 * guardado como hash), data de nascimento, contato, médico prescritor (CRM),
 * validade da prescrição e cota mensal em gramas. Os obrigatórios são marcados
 * com .aui-field--required.
 *
 * Um único botão primário "Confirmar cadastro" chama a tool `register_member`
 * com os valores dos campos via AuiBridge.callTool. Não há cancelar dedicado — o
 * "Editar" é implícito: todos os inputs são editáveis antes do confirm
 * (review+confirm).
 *
 * 100% sobre as primitivas de form do kit (.aui-field / .aui-input /
 * .aui-input-group / .aui-btn / .aui-alert) + tokens — sem <style> inline, sem
 * tokens --mcp-app-*. Render idempotente; size negotiation via kit bridge.
 *
 * LGPD: o CPF é armazenado como hash (nunca em claro); o help do campo deixa isso
 * explícito. O formulário só trafega o que o operador acabou de revisar/confirmar.
 */
import { htmlShell } from "../../kit/shell.js";
import { ANCHOR, type WidgetDef } from "../../kit/types.js";

// Synthetic extracted member so the gallery card looks populated (the NL → form
// flow: these are the fields the agent "extracted" from the chat message).
const SAMPLE = {
  fullName: "Fulano de Tal",
  cpf: "123.456.789-00",
  birthDate: "1989-04-12",
  contact: "fulano@email.com",
  prescriber: "Dra. Ana Costa · CRM-SP 123456",
  prescriptionValidUntil: "2026-12-31",
  monthlyQuotaG: 45,
};

function str(args: Record<string, unknown>, key: string, fallback: string): string {
  const v = args[key];
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function buildData(args: Record<string, unknown>): Record<string, unknown> {
  const monthlyQuotaG =
    typeof args.monthlyQuotaG === "number" && Number.isFinite(args.monthlyQuotaG)
      ? args.monthlyQuotaG
      : SAMPLE.monthlyQuotaG;

  return {
    asOf: typeof args.as_of === "string" ? args.as_of : ANCHOR,
    fullName: str(args, "fullName", SAMPLE.fullName),
    cpf: str(args, "cpf", SAMPLE.cpf),
    birthDate: str(args, "birthDate", SAMPLE.birthDate),
    contact: str(args, "contact", SAMPLE.contact),
    prescriber: str(args, "prescriber", SAMPLE.prescriber),
    prescriptionValidUntil: str(
      args,
      "prescriptionValidUntil",
      SAMPLE.prescriptionValidUntil,
    ),
    monthlyQuotaG,
  };
}

function summary(data: Record<string, unknown>): string {
  return (
    `Cadastrar membro (revisar + confirmar): ${data.fullName}, CPF ${data.cpf} ` +
    `(armazenado como hash — LGPD), nascido em ${data.birthDate}, contato ` +
    `${data.contact}, prescritor ${data.prescriber}, prescrição válida até ` +
    `${data.prescriptionValidUntil}, cota mensal ${data.monthlyQuotaG}g. ` +
    `O formulário abre PRÉ-PREENCHIDO com os campos que o agente extraiu da ` +
    `mensagem; o operador revisa, edita qualquer campo se preciso e confirma. ` +
    `"Confirmar cadastro" chama register_member com os valores dos campos.`
  );
}

const RENDER_JS = `
function render(data) {
  data = data || {};

  // ── element handles (built once in bodyHtml; render() only updates state) ──
  var nameEl = document.getElementById('fullName');
  var cpfEl = document.getElementById('cpf');
  var birthEl = document.getElementById('birthDate');
  var contactEl = document.getElementById('contact');
  var prescriberEl = document.getElementById('prescriber');
  var validEl = document.getElementById('prescriptionValidUntil');
  var quotaEl = document.getElementById('monthlyQuotaG');
  var submitBtn = document.getElementById('submitBtn');
  var errEl = document.getElementById('formError');
  if (!nameEl || !cpfEl || !birthEl || !contactEl || !prescriberEl || !validEl || !quotaEl || !submitBtn) return;

  // ── pre-fill every field from baked/live extracted data (idempotent) ──
  // This is the "NL → pre-filled form" payoff: the agent's extracted fields
  // land straight into the inputs; the operator only reviews + confirms.
  if (typeof data.fullName === 'string' && data.fullName) nameEl.value = data.fullName;
  if (typeof data.cpf === 'string' && data.cpf) cpfEl.value = data.cpf;
  if (typeof data.birthDate === 'string' && data.birthDate) birthEl.value = data.birthDate;
  if (typeof data.contact === 'string' && data.contact) contactEl.value = data.contact;
  if (typeof data.prescriber === 'string' && data.prescriber) prescriberEl.value = data.prescriber;
  if (typeof data.prescriptionValidUntil === 'string' && data.prescriptionValidUntil) validEl.value = data.prescriptionValidUntil;
  if (typeof data.monthlyQuotaG === 'number' && isFinite(data.monthlyQuotaG)) quotaEl.value = String(data.monthlyQuotaG);

  // ── wire actions once (guard against re-render double-binding) ──
  if (submitBtn.dataset.wired === '1') return;
  submitBtn.dataset.wired = '1';

  function showError(msg) {
    if (!errEl) return;
    errEl.textContent = msg || '';
    errEl.hidden = !msg;
  }

  function collect() {
    return {
      fullName: (nameEl.value || '').trim(),
      cpf: (cpfEl.value || '').trim(),
      birthDate: (birthEl.value || '').trim(),
      contact: (contactEl.value || '').trim(),
      prescriber: (prescriberEl.value || '').trim(),
      prescriptionValidUntil: (validEl.value || '').trim(),
      monthlyQuotaG: Number(quotaEl.value)
    };
  }

  function validate(v) {
    if (!v.fullName) return 'Informe o nome completo.';
    if (!v.cpf) return 'Informe o CPF.';
    if (!v.birthDate) return 'Informe a data de nascimento.';
    if (!v.prescriber) return 'Informe o médico prescritor (CRM).';
    if (!v.prescriptionValidUntil) return 'Informe a validade da prescrição.';
    if (!isFinite(v.monthlyQuotaG) || v.monthlyQuotaG <= 0) return 'Informe a cota mensal em gramas.';
    return null;
  }

  function call(name, args) {
    try {
      if (window.AuiBridge && typeof window.AuiBridge.callTool === 'function') {
        return window.AuiBridge.callTool(name, args);
      }
    } catch (e) { /* no host in raw preview */ }
    return null;
  }

  submitBtn.addEventListener('click', function () {
    if (submitBtn.disabled) return;
    var payload = collect();
    var problem = validate(payload);
    if (problem) { showError(problem); return; }
    showError('');

    var btn = submitBtn;
    btn.classList.add('is-loading');
    btn.disabled = true;
    var p = call('register_member', payload);
    var done = function () {
      btn.classList.remove('is-loading');
      btn.textContent = 'Cadastro confirmado ✓';
    };
    var fail = function () {
      btn.classList.remove('is-loading');
      btn.disabled = false;
    };
    if (p && typeof p.then === 'function') { p.then(done, fail); }
    else { done(); }
  });
}
`;

const BODY_HTML = `
<form class="aui-form" id="member-registration-form" autocomplete="off" novalidate
      style="max-width:460px;margin:0 auto;">

  <div class="aui-field">
    <p class="aui-field__help" style="margin:0;">
      Revise os dados extraídos e confirme o cadastro.
      <em style="color:var(--muted-foreground);">Pré-preenchido pelo agente a partir da sua mensagem.</em>
    </p>
  </div>

  <div class="aui-field aui-field--required">
    <label class="aui-field__label" for="fullName">Nome completo</label>
    <input class="aui-input" id="fullName" name="fullName" type="text"
           autocomplete="off" placeholder="Nome do associado"
           value="Fulano de Tal" aria-describedby="fullName-help" />
    <span class="aui-field__help" id="fullName-help">Nome civil completo do associado.</span>
  </div>

  <div class="aui-field aui-field--required">
    <label class="aui-field__label" for="cpf">CPF</label>
    <input class="aui-input" id="cpf" name="cpf" type="text"
           inputmode="numeric" autocomplete="off" placeholder="000.000.000-00"
           value="123.456.789-00" aria-describedby="cpf-help" />
    <span class="aui-field__help" id="cpf-help">Armazenado como <strong>hash</strong> — nunca em claro (LGPD).</span>
  </div>

  <div class="aui-field aui-field--required">
    <label class="aui-field__label" for="birthDate">Data de nascimento</label>
    <input class="aui-input" id="birthDate" name="birthDate" type="date"
           autocomplete="off" value="1989-04-12" aria-describedby="birthDate-help" />
    <span class="aui-field__help" id="birthDate-help">Usada para validar maioridade.</span>
  </div>

  <div class="aui-field">
    <label class="aui-field__label" for="contact">Contato</label>
    <input class="aui-input" id="contact" name="contact" type="text"
           inputmode="email" autocomplete="off" placeholder="e-mail ou telefone"
           value="fulano@email.com" aria-describedby="contact-help" />
    <span class="aui-field__help" id="contact-help">E-mail ou telefone para comunicação da associação.</span>
  </div>

  <div class="aui-field aui-field--required">
    <label class="aui-field__label" for="prescriber">Médico prescritor (CRM)</label>
    <input class="aui-input" id="prescriber" name="prescriber" type="text"
           autocomplete="off" placeholder="Dr(a). Nome · CRM-UF 000000"
           value="Dra. Ana Costa · CRM-SP 123456" aria-describedby="prescriber-help" />
    <span class="aui-field__help" id="prescriber-help">Profissional responsável pela prescrição (nome + CRM).</span>
  </div>

  <div class="aui-field aui-field--required">
    <label class="aui-field__label" for="prescriptionValidUntil">Validade da prescrição</label>
    <input class="aui-input" id="prescriptionValidUntil" name="prescriptionValidUntil" type="date"
           autocomplete="off" value="2026-12-31" aria-describedby="prescriptionValidUntil-help" />
    <span class="aui-field__help" id="prescriptionValidUntil-help">A cota fica suspensa após o vencimento da prescrição.</span>
  </div>

  <div class="aui-field aui-field--required">
    <label class="aui-field__label" for="monthlyQuotaG">Cota mensal</label>
    <div class="aui-input-group">
      <input class="aui-input" id="monthlyQuotaG" name="monthlyQuotaG" type="number"
             step="1" min="1" inputmode="numeric" placeholder="0"
             value="45" aria-describedby="monthlyQuotaG-help" />
      <span class="aui-input-group__addon">g</span>
    </div>
    <span class="aui-field__help" id="monthlyQuotaG-help">Limite mensal de dispensação, conforme a prescrição.</span>
  </div>

  <p class="aui-field__error" id="formError" role="alert" hidden></p>

  <aside class="aui-alert aui-alert--info" role="note">
    <span class="aui-alert__icon" aria-hidden="true">ℹ︎</span>
    <div class="aui-alert__body">
      <div class="aui-alert__title">Confira antes de confirmar</div>
      <p class="aui-alert__desc">
        Confira os dados antes de confirmar — você pode editar qualquer campo.
      </p>
    </div>
  </aside>

  <div class="aui-form-actions">
    <button class="aui-btn aui-btn--primary aui-btn--block" id="submitBtn" type="button"
            title="Cadastra o associado com os dados revisados (register_member)">
      Confirmar cadastro
    </button>
  </div>

</form>
`;

function html(data: Record<string, unknown>): string {
  return htmlShell({
    title: "Cadastrar membro",
    categoryLabel: "Cadastro",
    subtitle: `Pré-preenchido pelo agente a partir da sua mensagem — revise e confirme · em ${data.asOf}`,
    data,
    bodyHtml: BODY_HTML,
    renderJs: RENDER_JS,
    forms: true,
  });
}

export const def: WidgetDef = {
  name: "canna_member_registration",
  title: "Cadastrar membro",
  description:
    "Formulário de cadastro de associado que abre PRÉ-PREENCHIDO a partir da extração do agente. O fluxo é 'linguagem natural → form pré-preenchido → confirmar': o usuário escreve no chat (ex.: 'Cadastrar Fulano de Tal, CPF x, nascido em y, prescrição z'), o agente extrai os campos e abre este formulário já populado para o operador revisar e confirmar (ou corrigir qualquer campo — todos os inputs ficam editáveis). Sete campos: nome completo, CPF (armazenado como hash — LGPD), data de nascimento, contato (e-mail/telefone), médico prescritor (nome + CRM), validade da prescrição e cota mensal em gramas. Um botão primário 'Confirmar cadastro' chama register_member com os valores revisados; o 'Editar' é implícito (campos editáveis). Construído sobre as primitivas de form do kit. Valores sintéticos pré-preenchidos (Fulano de Tal, CPF de exemplo, cota 45g) para demonstrar o form populado na galeria.",
  category: "membership",
  inputShape: {},
  resourceUri: "ui://canna/member-registration",
  resourceName: "member-registration",
  version: "0.1.0",
  status: "experimental",
  added: "2026-06-11",
  buildData,
  summary,
  html,
  meta: { prefersBorder: true, csp: { connectDomains: ["self"] } },
};
