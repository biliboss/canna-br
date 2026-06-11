#!/usr/bin/env node
/**
 * bake-gallery.mjs — compile the operational MCP App widgets into
 * SELF-CONTAINED, baked-data HTML for the docsite gallery.
 *
 * Takes each `dist/<slug>.html` single-file bundle (CSS+JS already inlined by
 * viteSingleFile) and injects a deterministic `window.__DATA__` payload plus a
 * tiny self-fire shim that re-posts the exact host frame each widget already
 * listens for (`{ type: "ui/notifications/tool-result", params: { content:
 * [{ text }] } }`). Result renders standalone with NO host/bridge — purely so
 * the widgets are VISIBLE for review in the gallery; live actions still no-op.
 *
 * We do NOT touch widget logic. The injected shim only feeds the data the
 * widget already knows how to render.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(HERE, "..");
const DIST = resolve(PKG_ROOT, "dist");
const OUT = resolve(PKG_ROOT, "../../apps/docs/public/apps");

mkdirSync(OUT, { recursive: true });

/** Deterministic synthetic payloads matching each widget's render contract. */
const BAKED = {
  "member-quota-card": {
    memberId: "ASSOC-01J8Z4K2M9",
    status: "ATIVO",
    consumedG: 38.5,
    prescription: { monthlyQuotaG: 45 },
    recent: [
      { date: "2026-06-08", quantityG: 12.0, lotId: "01J8ZQ4LOT0A91F" },
      { date: "2026-05-28", quantityG: 15.0, lotId: "01J8ZQ4LOT07E2C" },
      { date: "2026-05-14", quantityG: 11.5, lotId: "01J8ZQ4LOT0C4D8" },
    ],
  },
  "traceability-timeline": {
    timeline: [
      { phase: "Associado", date: "2026-01-12" },
      { phase: "Prescrição", date: "2026-02-03" },
      { phase: "Lote (FIFO)", date: "2026-05-20" },
      { phase: "Dispensação", date: "2026-06-08" },
      { phase: "SNGPC", date: "2026-06-09" },
    ],
  },
  // dispensation-form renders its inputs unconditionally; the baked frame only
  // populates the read-only preview pane so the panel is non-empty in review.
  "dispensation-form": {
    memberId: "ASSOC-01J8Z4K2M9",
    lotId: "01J8ZQ4LOT0A91F",
    quantityG: 12.0,
    note: "Pré-visualização (draft_dispensation) — pendente de aprovação do RT.",
  },
};

const SLUGS = Object.keys(BAKED);

const inject = (html, payload) => {
  const dataJson = JSON.stringify(payload);
  const shim = `
<script>window.__DATA__ = ${dataJson};</script>
<script>(function () {
  // Self-fire: feed the baked payload through the exact host frame the widget
  // listens for, so it renders standalone in the gallery (no MCP host present).
  function fire() {
    if (typeof window.__DATA__ === 'undefined') return;
    var frame = {
      type: 'ui/notifications/tool-result',
      params: { content: [{ type: 'text', text: JSON.stringify(window.__DATA__) }] }
    };
    window.dispatchEvent(new MessageEvent('message', { data: frame }));
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fire);
  } else { fire(); }
})();</script>
`;
  return html.replace("</body>", `${shim}</body>`);
};

let ok = 0;
for (const slug of SLUGS) {
  const src = resolve(DIST, `${slug}.html`);
  const dst = resolve(OUT, `${slug}.html`);
  const html = readFileSync(src, "utf8");
  if (!html.includes("</body>")) {
    console.error(`✗ ${slug}: no </body> anchor`);
    continue;
  }
  writeFileSync(dst, inject(html, BAKED[slug]), "utf8");
  console.log(`✓ ${slug} → ${dst}`);
  ok += 1;
}
console.log(`\nBaked ${ok}/${SLUGS.length} gallery widgets.`);
