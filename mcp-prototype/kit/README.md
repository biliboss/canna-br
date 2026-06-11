# Kanban Widget Kit

A set of **MCP-App widgets** (sandboxed iframe UI attached to MCP tool calls) for
Kanban flow metrics, flow management, and Flight Levels — plus a themable,
shadcn-inspired **Atomic-Design system** and a hand-made **component showcase**.

Self-contained: each widget is one HTML document with inlined CSS + JS. No CDN,
no fonts, no network (the MCP-App sandbox exposes no controllable script-src).

## Run

```bash
pnpm dev            # tsx watch server.ts  → http://localhost:8765
```

- `GET /mcp` — MCP Streamable HTTP endpoint (tools + ui:// resources)
- `GET /gallery` — every widget in a live iframe (`?theme=light` too)
- `GET /showcase` — the component catalog (tokens, atoms, molecules, forms, charts), dark/light toggle
- `GET /preview/:slug` — raw self-contained widget HTML (baked synthetic data)
- `GET /widgets.json` — machine list

## Widgets (1 tool + 1 `ui://` resource each, registry-driven in `registry.ts`)

| slug | tool | category | engine |
|---|---|---|---|
| cfd | `kanban_cfd` | metrics | ECharts (stacked area) |
| cycle-time-scatter | `kanban_cycle_time_scatter` | metrics | ECharts (scatter + percentile lines) |
| throughput | `kanban_throughput_run_chart` | metrics | ECharts (bar + rolling avg) |
| aging-wip | `kanban_aging_wip` | metrics | ECharts (scatter over stages) |
| monte-carlo | `kanban_monte_carlo` | metrics | ECharts (live client-side sim) |
| cycle-time-histogram | `kanban_cycle_time_histogram` | metrics | ECharts (histogram) |
| flow-scorecard | `kanban_flow_scorecard` | metrics | DOM + SVG sparklines |
| board | `kanban_board` | flow | DOM (columns + WIP limits) |
| flight-levels | `flight_levels_map` | flight-levels | DOM (FL3→FL2→FL1) |

## Architecture

```
kit/
  tokens.ts      TOKENS_CSS      design tokens (OKLCH, themable [data-theme])
  atoms.ts       ATOMS_CSS       badge/label, button, card, stat, chip, progress, kbd, chrome
  molecules.ts   MOLECULES_CSS   KPI grid, statcard, legend, tooltip, chart styling, board, FL lanes, controls
  forms.ts       FORMS_CSS       CRUD set: inputs/select/checkbox/switch, data table, dialog, toast, alert, inline-edit, tag-input
                 FORMS_DEMO_HTML showcase markup for the above
  charts.ts      CHARTS_JS       zero-dep SVG micro-lib (sparklines + simple charts)
  echarts.ts     ECHARTS_JS      tree-shaken ECharts bundle (~635KB) + ECHARTS_THEME_JS (tokens→theme bridge)
  echarts/       entry.ts        tree-shake entry → `pnpm run build:echarts` → echarts.bundle.js
  bridge.ts      BRIDGE_JS       iframe-side MCP-App protocol (handshake, theme, live tool-result, callTool)
  shell.ts       htmlShell()     assembles a widget HTML doc; { echarts: true } inlines ECharts
  showcase.ts    showcaseHtml()  hand-made component catalog (zero drift — same CSS strings)
  types.ts       WidgetDef + stats/Monte-Carlo/date helpers
  CONTRACT.md    the class/token/API contract (read before editing the design system)
```

Atomic layering: **tokens → atoms → molecules → (forms) →** widgets compose into organisms.
Theme swap needs ZERO widget changes — everything reads tokens; ECharts recolors via a
MutationObserver on `<html data-theme>`.

## Add a widget

1. `widgets/kanban/<slug>.ts` exports `const def: WidgetDef` — mirror `cycle-time-scatter.ts`
   (ECharts) or `flow-scorecard.ts` (DOM). `buildData(args)` (deterministic synthetic via
   `mulberry32`), `summary(data)`, `html(data) → htmlShell({...})`.
2. `render(data)` (in the `renderJs` string) is idempotent, mounts in `#aui-body`.
3. For charts: `htmlShell({ echarts: true })`, then
   `AuiECharts.mount(el).setOption(function (pal) { return option; })` — the **builder form**
   recomputes colors on theme flip. Use `pal.chart[i] / pal.atRisk / pal.blocked / pal.onTrack / pal.muted`.
4. Register in `registry.ts`.

## Data flow into the iframe

- **Baked**: `buildData(defaults)` is JSON-injected as `__DATA__` → renders standalone (preview/gallery).
- **Live**: the host pushes the real tool result via `ui/notifications/tool-result`; the bridge
  re-fires `render(result)` (parses `structuredContent`).

## ECharts bundle

`pnpm run build:echarts` regenerates `kit/echarts/echarts.bundle.js` from `kit/echarts/entry.ts`
(esbuild, tree-shaken: line/bar/scatter/custom + grid/tooltip/legend/markLine/markArea/dataZoom/graphic/axisPointer + canvas).
