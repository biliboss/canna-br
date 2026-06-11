/**
 * member-lifecycle-board — MCP App entry shim.
 *
 * The HTML bundle for this app is self-contained: the kit's CSS design-system,
 * the BRIDGE_JS protocol handler, and the render function are all inlined by
 * the mcp-prototype kit's htmlShell() generator. There is no external asset to
 * load here.
 *
 * This file exists to satisfy the @canna/ui-apps package convention (every
 * slug ships a main.ts alongside app.html). It is NOT referenced from app.html
 * and is NOT bundled into dist/member-lifecycle-board.html; vite processes
 * app.html directly as the rollup entry.
 *
 * The bridge accepts BOTH host message envelopes:
 *   { method: "ui/notifications/tool-result", params: ... }  ← kit-native
 *   { type:   "ui/notifications/tool-result", params: ... }  ← canna-br host
 * via the `var method = msg.method || msg.type;` patch in kit/bridge.ts.
 */
export {};
