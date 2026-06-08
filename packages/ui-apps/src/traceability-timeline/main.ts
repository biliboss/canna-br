/**
 * Traceability Timeline — MCP App entry script.
 *
 * Renders the member → prescription → lot → dispensation audit chain as a
 * horizontal flow of nodes. Data arrives via host `ui/notifications/tool-result`.
 */
export {}; // mark as ES module so top-level `const` names don't leak globally

interface TimelineStep {
  readonly phase: string;
  readonly date?: string;
}

interface TraceabilityPayload {
  readonly timeline?: readonly TimelineStep[];
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) =>
    c === "&"
      ? "&amp;"
      : c === "<"
        ? "&lt;"
        : c === ">"
          ? "&gt;"
          : c === '"'
            ? "&quot;"
            : "&#39;",
  );

const render = (data: TraceabilityPayload | null | undefined): void => {
  if (!data?.timeline?.length) {
    root.innerHTML = '<div class="empty">No timeline data yet (v0.2.1 stub).</div>';
    return;
  }
  const html: string[] = ['<div class="timeline">'];
  data.timeline.forEach((step, i) => {
    if (i > 0) html.push('<div class="arrow">→</div>');
    html.push(
      `<div class="step"><div class="node">${escapeHtml(step.phase)}</div>` +
        `<div class="meta">${escapeHtml(step.date ?? "")}</div></div>`,
    );
  });
  html.push("</div>");
  root.innerHTML = html.join("");
};

window.addEventListener("message", (e: MessageEvent) => {
  const payload = e.data as
    | { type?: string; params?: { content?: ReadonlyArray<{ text?: string }> } }
    | null
    | undefined;
  if (payload?.type !== "ui/notifications/tool-result") return;
  const text = payload.params?.content?.[0]?.text;
  if (typeof text !== "string") return;
  try {
    render(JSON.parse(text) as TraceabilityPayload);
  } catch {
    // ignore
  }
});
