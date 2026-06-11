# Kanban Widget Kit — Contract

Single source of truth for the design system + widget fan-out. Designer owns the
*visual* implementation of TOKENS/ATOMS/MOLECULES; widget authors consume the
class + chart + bridge APIs below. **Class names and CSS var names are a contract
— add freely, do not rename/remove.**

Atomic design layering:
- **tokens** (`tokens.ts` → `TOKENS_CSS`)   = design tokens only (CSS custom props, themable)
- **atoms** (`atoms.ts` → `ATOMS_CSS`)       = badge/label, button, card, stat, chip, progress, divider, kbd, widget chrome
- **molecules** (`molecules.ts` → `MOLECULES_CSS`) = statcard, kpis grid, legend, tooltip, chart element styling, board column, flight-levels lane
- widgets compose atoms+molecules into **organisms/templates** (one self-contained HTML doc each)

## Theming

`<html data-theme="dark">` by default. Tokens defined for `[data-theme="dark"]`
and `[data-theme="light"]`. The bridge sets `data-theme` from host context / `?theme=`.
Everything must read from tokens so a theme swap needs no per-widget change.

## Design tokens (CSS custom properties)

Surface/text:  `--background --foreground --card --card-foreground --muted --muted-foreground --border --input --ring`
Brand:         `--primary --primary-foreground --accent --accent-foreground`
Status:        `--success --warning --destructive` (+ `-foreground`)  `--on-track --at-risk --aging --done --blocked`
Class of svc:  `--cos-expedite --cos-fixed-date --cos-standard --cos-intangible`
Chart ramp:    `--chart-1 … --chart-8`
Flight levels: `--fl-1 --fl-2 --fl-3`
Scale:         `--radius --radius-sm --radius-lg --font-sans --font-mono`
               `--text-xs --text-sm --text-base --text-lg --shadow --shadow-lg`

## Atom classes

Widget chrome: `.aui-widget .aui-widget__head .aui-widget__heading .aui-widget__title .aui-widget__subtitle .aui-widget__body`
Badge/label (EVENT + STATUS LABELS ARE ATOMS):
  `.aui-badge` + modifiers `--category --neutral --primary --success --warning --destructive`
  status: `--blocked --at-risk --on-track --aging --done`
  class-of-service: `--expedite --fixed-date --standard --intangible`
  flight level: `--fl1 --fl2 --fl3`
Button:   `.aui-btn` + `--primary --ghost --sm`
Card:     `.aui-card`
Stat:     `.aui-stat .aui-stat__label .aui-stat__value .aui-stat__unit .aui-stat__delta` + `.aui-stat--up .aui-stat--down`
Chip:     `.aui-chip`
Progress: `.aui-progress .aui-progress__bar` + `.aui-progress--over` (over WIP limit)
Misc:     `.aui-divider .aui-kbd`

## Molecule classes

KPIs:    `.aui-kpis` (responsive grid)  `.aui-statcard` (stat + optional sparkline slot `.aui-statcard__spark`)
Legend:  `.aui-legend .aui-legend__item .aui-legend__swatch`
Tooltip: `.aui-tooltip` (chart hover; fixed-positioned by charts.ts)
Empty:   `.aui-empty`
Controls:`.aui-toolbar .aui-segment .aui-segment__btn (.is-active) .aui-slider .aui-field .aui-field__label`
Board:   `.aui-board .aui-col .aui-col__head .aui-col__title .aui-col__count .aui-cardlet .aui-cardlet__title .aui-cardlet__meta`
Flight:  `.aui-fl .aui-fl__lane .aui-fl__lane-head .aui-fl__items`
Chart SVG (styled by molecules, emitted by charts.ts):
  `.aui-chart .aui-axis .aui-axis-x .aui-axis-y .aui-tick .aui-tickline .aui-grid .aui-axis-label`
  `.aui-line .aui-area .aui-stack .aui-band (.s0..s7) .aui-bars .aui-bar .aui-dots .aui-dot`
  `.aui-rule .aui-rule-line .aui-rule-label .aui-spark .aui-spark-end`

## AuiCharts API (charts.ts — already implemented, do NOT edit for widgets)

```
AuiCharts.frame(hostEl, {width,height,margin})  -> {svg, plot, iw, ih, m, width, height}
AuiCharts.scaleLinear([d0,d1],[r0,r1])          -> fn(v)->px ; fn.invert(px) ; fn.domain ; fn.range
AuiCharts.scaleBand(keys,[r0,r1],pad)           -> {x(k), center(k), bw, step, keys}
AuiCharts.niceTicks(d0,d1,count)                -> number[]
AuiCharts.axisBottom(plot, scale, {y, ticks?, fmt?, band?, count?})
AuiCharts.axisLeft(plot, scale, {x, ticks?, fmt?, grid?, gridW?, label?, count?})
AuiCharts.line(plot, [{x,y}], {cls})
AuiCharts.area(plot, [{x,y}], y0, {cls})
AuiCharts.stackBands(plot, [{pts:[{x,yTop,yBot}], cls}])
AuiCharts.bars(plot, [{x,y,w,h,cls,rx,data}])
AuiCharts.dots(plot, [{x,y,r,data}], {r, cls, clsFn})
AuiCharts.hRule(plot, y, x0, x1, {label, cls})
AuiCharts.sparkline(hostEl, values, {cls,width,height})
AuiCharts.tooltip(hostEl) -> {show(html,clientX,clientY), hide(), bind(el, (data,target)=>html)}
AuiCharts.el(tag, attrs, parent)  // attrs.text sets textContent, attrs.cls sets class
```

## AuiBridge API (bridge.ts — already implemented)

```
AuiBridge.init({ onData, onInput?, onTheme? })  // wired automatically by htmlShell
AuiBridge.callTool(name, args) -> Promise<result>
AuiBridge.sendMessage(text) ; AuiBridge.openLink(url) ; AuiBridge.requestDisplayMode(mode)
AuiBridge.notifySize() ; AuiBridge.applyTheme('dark'|'light')
```

## WidgetDef (types.ts) + render contract

Each widget file exports `const def: WidgetDef`. `def.html(data)` calls `htmlShell({...})`.
The `renderJs` string MUST define `function render(data){...}` (idempotent: clear root, redraw).
It receives baked `__DATA__` on mount and the live tool result on every push.
Use `document.getElementById('aui-body')` as the mount root.

Self-contained: NO external CDN / fonts / network. All paint via tokens. Charts via AuiCharts.
