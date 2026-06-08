/**
 * Member Quota Card — MCP App entry script.
 *
 * Contract:
 *  - Host posts `{ type: "ui/notifications/tool-result", params: { content: [{ text }] } }`
 *  - We parse `text` as JSON `MemberQuotaPayload` and render the card.
 */
export {}; // mark as ES module so top-level `const` names don't leak globally

interface RecentDispensation {
  readonly date: string;
  readonly quantityG: number;
  readonly lotId?: string;
}

interface MemberQuotaPayload {
  readonly memberId?: string;
  readonly status?: string;
  readonly consumedG?: number;
  readonly prescription?: { readonly monthlyQuotaG?: number };
  readonly recent?: readonly RecentDispensation[];
}

const byId = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
};

const titleEl = byId("title");
const statusEl = byId("status");
const fill = byId("fill");
const consumedEl = byId("consumed");
const capEl = byId("cap");
const recentList = byId<HTMLUListElement>("recent");

const render = (data: MemberQuotaPayload | null | undefined): void => {
  if (!data) return;
  titleEl.textContent = data.memberId ?? "Member";
  statusEl.textContent = `Status: ${data.status ?? "—"}`;
  const cap = data.prescription?.monthlyQuotaG ?? 0;
  const consumed = data.consumedG ?? 0;
  const pct = cap > 0 ? Math.min(100, (consumed / cap) * 100) : 0;
  fill.style.width = `${pct}%`;
  fill.className =
    "fill" + (pct > 100 ? " danger" : pct > 80 ? " warn" : "");
  consumedEl.textContent = `${consumed} g`;
  capEl.textContent = `of ${cap} g`;
  recentList.innerHTML = "";
  for (const d of data.recent ?? []) {
    const li = document.createElement("li");
    const lotShort = d.lotId ? d.lotId.slice(0, 8) : "?";
    li.textContent = `${d.date} — ${d.quantityG} g (lot ${lotShort})`;
    recentList.appendChild(li);
  }
};

window.addEventListener("message", (e: MessageEvent) => {
  const payload = e.data as
    | { type?: string; params?: { content?: ReadonlyArray<{ text?: string }> } }
    | null
    | undefined;
  if (!payload || typeof payload !== "object") return;
  if (payload.type !== "ui/notifications/tool-result") return;
  const text = payload.params?.content?.[0]?.text;
  if (typeof text !== "string") return;
  try {
    render(JSON.parse(text) as MemberQuotaPayload);
  } catch {
    // ignore malformed payloads — host may emit partial frames during streaming.
  }
});
