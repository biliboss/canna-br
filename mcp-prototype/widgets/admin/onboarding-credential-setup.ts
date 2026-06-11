/**
 * Primeiro acesso — onboarding-credential-setup (canna-br admin control-center).
 *
 * A onboarding gate shown on the associate's very first login. The association
 * provisions a TEMPORARY login (e-mail provisório + senha = o próprio e-mail) so
 * the new member can enter once. This widget is the mandatory step where they
 * replace that throwaway credential with a real e-mail + password before they may
 * continue. There is no cancel/secondary path — defining real access is required.
 *
 * Três campos (todos obrigatórios): "E-mail real" (type=email), "Nova senha"
 * (type=password, mín. 8) e "Confirmar senha" (type=password). Um único botão
 * primário "Definir meu acesso" chama a tool `set_initial_credentials` com
 * { email, password } via AuiBridge.callTool — o host troca a credencial
 * temporária pela definitiva e o acesso provisório expira na hora.
 *
 * O painel mostra, em modo somente-leitura, o login temporário que está sendo
 * substituído (e-mail provisório + a nota "senha = e-mail") para o usuário ver o
 * que está trocando. Os campos editáveis nascem vazios com placeholders.
 *
 * 100% sobre as primitivas de form do kit (.aui-field / .aui-input /
 * .aui-input-group / .aui-btn / .aui-alert) + tokens — sem <style> inline, sem
 * tokens --mcp-app-*. Render idempotente; size negotiation via kit bridge.
 *
 * LGPD: o e-mail provisório aparece só como contexto de leitura; a tool recebe
 * apenas { email, password } que o próprio usuário acabou de digitar.
 */
import { htmlShell } from "../../kit/shell.js";
import { ANCHOR, type WidgetDef } from "../../kit/types.js";

// Synthetic onboarding context so the gallery card looks populated (not empty).
const SAMPLE = {
  associationName: "Casa da Mata",
  tempEmail: "casadamata@canna.br",
};

function buildData(args: Record<string, unknown>): Record<string, unknown> {
  const associationName =
    typeof args.associationName === "string" && args.associationName.trim()
      ? args.associationName.trim()
      : SAMPLE.associationName;
  const tempEmail =
    typeof args.tempEmail === "string" && args.tempEmail.trim()
      ? args.tempEmail.trim()
      : SAMPLE.tempEmail;

  return {
    asOf: typeof args.as_of === "string" ? args.as_of : ANCHOR,
    associationName,
    tempEmail,
  };
}

function summary(data: Record<string, unknown>): string {
  return (
    `Primeiro acesso a ${data.associationName}: o associado entrou com um login ` +
    `temporário (${data.tempEmail}, senha = e-mail) e precisa definir o acesso real ` +
    `antes de continuar. Três campos — e-mail real, nova senha (mín. 8) e ` +
    `confirmação — e o botão "Definir meu acesso" chama set_initial_credentials ` +
    `com { email, password }. O acesso temporário expira assim que o definitivo é ` +
    `definido; é um passo obrigatório, sem cancelar.`
  );
}

const RENDER_JS = `
function render(data) {
  data = data || {};

  // ── element handles (built once in bodyHtml; render() only updates state) ──
  var welcomeEl = document.getElementById('welcomeTitle');
  var tempEl = document.getElementById('tempLogin');
  var emailEl = document.getElementById('email');
  var passEl = document.getElementById('password');
  var confirmEl = document.getElementById('passwordConfirm');
  var submitBtn = document.getElementById('submitBtn');
  var errEl = document.getElementById('formError');
  if (!emailEl || !passEl || !confirmEl || !submitBtn) return;

  // ── fill read-only onboarding context from baked/live data (idempotent) ──
  if (welcomeEl && typeof data.associationName === 'string' && data.associationName) {
    welcomeEl.textContent = 'Bem-vindo(a) à ' + data.associationName + ' — primeiro acesso';
  }
  if (tempEl && typeof data.tempEmail === 'string' && data.tempEmail) {
    tempEl.textContent = data.tempEmail;
  }

  // ── wire actions once (guard against re-render double-binding) ──
  if (submitBtn.dataset.wired === '1') return;
  submitBtn.dataset.wired = '1';

  function showError(msg) {
    if (!errEl) return;
    errEl.textContent = msg || '';
    errEl.hidden = !msg;
  }

  function validate() {
    var email = (emailEl.value || '').trim();
    var pass = passEl.value || '';
    var confirm = confirmEl.value || '';
    if (!email || email.indexOf('@') < 1) return 'Informe um e-mail real válido.';
    if (pass.length < 8) return 'A senha precisa ter no mínimo 8 caracteres.';
    if (pass !== confirm) return 'A confirmação não confere com a senha.';
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
    var problem = validate();
    if (problem) { showError(problem); return; }
    showError('');

    var btn = submitBtn;
    btn.classList.add('is-loading');
    btn.disabled = true;
    var p = call('set_initial_credentials', {
      email: (emailEl.value || '').trim(),
      password: passEl.value || ''
    });
    var done = function () {
      btn.classList.remove('is-loading');
      btn.textContent = 'Acesso definido ✓';
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
<form class="aui-form" id="onboarding-form" autocomplete="off" novalidate
      style="max-width:440px;margin:0 auto;">

  <div class="aui-field">
    <h2 class="aui-field__label" id="welcomeTitle" style="font-size:var(--text-base);margin:0;">
      Bem-vindo(a) à Casa da Mata — primeiro acesso
    </h2>
    <p class="aui-field__help" style="margin:var(--space-1) 0 0;">
      Este é um acesso temporário. Defina seu e-mail e senha reais para continuar —
      é o que você usará para entrar daqui em diante.
    </p>
  </div>

  <div class="aui-field">
    <span class="aui-field__label">Acesso temporário (você está substituindo)</span>
    <div class="aui-input-group">
      <input class="aui-input" id="tempLogin" type="text" value="casadamata@canna.br"
             readonly tabindex="-1" aria-readonly="true"
             aria-describedby="tempLogin-help" />
      <span class="aui-input-group__addon">temporário</span>
    </div>
    <span class="aui-field__help" id="tempLogin-help">
      senha = e-mail, só p/ primeiro acesso.
    </span>
  </div>

  <div class="aui-field aui-field--required">
    <label class="aui-field__label" for="email">E-mail real</label>
    <input class="aui-input" id="email" name="email" type="email"
           inputmode="email" autocomplete="off"
           placeholder="voce@exemplo.com.br" aria-describedby="email-help" />
    <span class="aui-field__help" id="email-help">Será seu login definitivo na associação.</span>
  </div>

  <div class="aui-field aui-field--required">
    <label class="aui-field__label" for="password">Nova senha</label>
    <input class="aui-input" id="password" name="password" type="password"
           autocomplete="new-password"
           placeholder="••••••••" aria-describedby="password-help" />
    <span class="aui-field__help" id="password-help">Mín. 8 caracteres.</span>
  </div>

  <div class="aui-field aui-field--required">
    <label class="aui-field__label" for="passwordConfirm">Confirmar senha</label>
    <input class="aui-input" id="passwordConfirm" name="passwordConfirm" type="password"
           autocomplete="new-password"
           placeholder="••••••••" aria-describedby="passwordConfirm-help" />
    <span class="aui-field__help" id="passwordConfirm-help">Repita a senha acima.</span>
  </div>

  <p class="aui-field__error" id="formError" role="alert" hidden></p>

  <aside class="aui-alert aui-alert--info" role="note">
    <span class="aui-alert__icon" aria-hidden="true">ℹ︎</span>
    <div class="aui-alert__body">
      <div class="aui-alert__title">Passo obrigatório</div>
      <p class="aui-alert__desc">
        O acesso temporário expira assim que você definir seu acesso real —
        é obrigatório nesta primeira entrada.
      </p>
    </div>
  </aside>

  <div class="aui-form-actions">
    <button class="aui-btn aui-btn--primary aui-btn--block" id="submitBtn" type="button"
            title="Troca o acesso temporário pelo seu e-mail e senha definitivos">
      Definir meu acesso
    </button>
  </div>

</form>
`;

function html(data: Record<string, unknown>): string {
  return htmlShell({
    title: "Primeiro acesso — defina seu acesso",
    categoryLabel: "Onboarding",
    subtitle: `Acesso provisório → defina e-mail e senha reais para continuar · passo obrigatório · em ${data.asOf}`,
    data,
    bodyHtml: BODY_HTML,
    renderJs: RENDER_JS,
    forms: true,
  });
}

export const def: WidgetDef = {
  name: "canna_onboarding_credential_setup",
  title: "Primeiro acesso — defina seu acesso",
  description:
    "Tela de primeiro acesso (onboarding) do associado. A associação provisiona um login temporário (e-mail provisório com senha = o próprio e-mail) para o novo membro entrar uma única vez; este formulário é o passo obrigatório em que ele substitui essa credencial descartável por e-mail e senha reais antes de continuar. Mostra, em modo somente-leitura, o login temporário sendo substituído. Três campos obrigatórios — 'E-mail real' (type=email), 'Nova senha' (type=password, mín. 8) e 'Confirmar senha' — e um único botão primário 'Definir meu acesso' que chama set_initial_credentials com { email, password }; o acesso temporário expira assim que o definitivo é definido. Sem botão de cancelar (passo mandatório). Construído sobre as primitivas de form do kit. Valores sintéticos (associação 'Casa da Mata', e-mail provisório) pré-preenchidos para revisão da galeria.",
  category: "onboarding",
  inputShape: {},
  resourceUri: "ui://canna/onboarding-credential-setup",
  resourceName: "onboarding-credential-setup",
  version: "0.1.0",
  status: "experimental",
  added: "2026-06-11",
  buildData,
  summary,
  html,
  meta: { prefersBorder: true, csp: { connectDomains: ["self"] } },
};
