/**
 * Dispensation Form — MCP App entry script (Risk Level 3).
 *
 * Interactive form: Preview calls `draft_dispensation` (read-only); Submit
 * calls `request_record_dispensation` which the host must convert to a
 * PendingAction for RT approval (never executes immediately).
 */
export {}; // mark as ES module so top-level `const` names don't leak globally

interface ToolResultPayload {
  readonly type?: string;
  readonly method?: string;
  readonly params?: { readonly content?: ReadonlyArray<{ readonly text?: string }> };
}

interface DispensationFields {
  readonly memberId: string;
  readonly lotId: string;
  readonly quantityG: number;
}

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
};

const previewEl = $<HTMLPreElement>("preview");
const submitBtn = $<HTMLButtonElement>("submitBtn");
const previewBtn = $<HTMLButtonElement>("previewBtn");
const memberIdInput = $<HTMLInputElement>("memberId");
const lotIdInput = $<HTMLInputElement>("lotId");
const quantityInput = $<HTMLInputElement>("quantityG");

const postToHost = (msg: unknown): void => {
  window.parent.postMessage(msg, "*");
};

const collect = (): DispensationFields => ({
  memberId: memberIdInput.value.trim(),
  lotId: lotIdInput.value.trim(),
  quantityG: Number(quantityInput.value),
});

previewBtn.addEventListener("click", () => {
  postToHost({
    type: "ui/tools/call",
    params: { name: "draft_dispensation", arguments: collect() },
  });
});

submitBtn.addEventListener("click", () => {
  postToHost({
    type: "ui/tools/call",
    params: { name: "request_record_dispensation", arguments: collect() },
  });
});

window.addEventListener("message", (e: MessageEvent) => {
  const payload = e.data as ToolResultPayload | null | undefined;
  // assistant-ui host bridge keys the JSON-RPC envelope on `method`; preview
  // harnesses may use `type`. Accept both.
  const channel = payload?.method ?? payload?.type;
  if (channel !== "ui/notifications/tool-result") return;
  const text = payload?.params?.content?.[0]?.text;
  previewEl.hidden = false;
  previewEl.textContent = text ?? JSON.stringify(e.data, null, 2);
  submitBtn.disabled = false;
});

// Signal mount so the host flushes the queued tool result immediately.
try {
  window.parent.postMessage(
    { jsonrpc: "2.0", method: "notifications/initialized" },
    "*",
  );
} catch {
  // standalone/preview.
}
