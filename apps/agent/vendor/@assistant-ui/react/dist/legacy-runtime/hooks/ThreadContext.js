"use client";
import { createStateHookForRuntime } from "../../context/react/utils/createStateHookForRuntime.js";
import { useAui, useAuiEvent, useAuiState } from "@assistant-ui/store";
import { useState } from "@assistant-ui/tap/react-shim";
//#region src/legacy-runtime/hooks/ThreadContext.ts
function useThreadRuntime(options) {
	const aui = useAui();
	const runtime = useAuiState(() => aui.thread.source ? aui.thread().__internal_getRuntime?.() ?? null : null);
	if (!runtime && !options?.optional) throw new Error("ThreadRuntime is not available");
	return runtime;
}
/**
* @deprecated Use {@link useAuiState}: `useAuiState((s) => s.thread)`. See the {@link https://assistant-ui.com/docs/migrations/v0-12 migration guide}.
*
* Hook to access the current thread state.
*
* This hook provides reactive access to the thread's state, including messages,
* running status, capabilities, and other thread-level properties.
*
* @param selector Optional selector function to pick specific state properties
* @returns The selected thread state or the entire thread state if no selector provided
*
* @example
* ```tsx
* // Before:
* function ThreadStatus() {
*   const isRunning = useThread((state) => state.isRunning);
*   const messageCount = useThread((state) => state.messages.length);
*   return <div>Running: {isRunning}, Messages: {messageCount}</div>;
* }
*
* // After:
* function ThreadStatus() {
*   const isRunning = useAuiState((s) => s.thread.isRunning);
*   const messageCount = useAuiState((s) => s.thread.messages.length);
*   return <div>Running: {isRunning}, Messages: {messageCount}</div>;
* }
* ```
*/
const useThread = createStateHookForRuntime(useThreadRuntime);
const useThreadComposerRuntime = (opt) => useThreadRuntime(opt)?.composer ?? null;
/**
* @deprecated Use {@link useAuiState}: `useAuiState((s) => s.thread.composer)`. See the {@link https://assistant-ui.com/docs/migrations/v0-12 migration guide}.
*/
const useThreadComposer = createStateHookForRuntime(useThreadComposerRuntime);
function useThreadModelContext(options) {
	const [, rerender] = useState({});
	const runtime = useThreadRuntime(options);
	useAuiEvent("thread.modelContextUpdate", () => rerender({}));
	if (!runtime) return null;
	return runtime?.getModelContext();
}
//#endregion
export { useThread, useThreadComposer, useThreadModelContext, useThreadRuntime };

//# sourceMappingURL=ThreadContext.js.map