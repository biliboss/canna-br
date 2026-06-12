"use client";
import { createStateHookForRuntime } from "../../context/react/utils/createStateHookForRuntime.js";
import { useAui, useAuiState } from "@assistant-ui/store";
//#region src/legacy-runtime/hooks/ThreadListItemContext.ts
function useThreadListItemRuntime(options) {
	const aui = useAui();
	const runtime = useAuiState(() => aui.threadListItem.source ? aui.threadListItem().__internal_getRuntime?.() ?? null : null);
	if (!runtime && !options?.optional) throw new Error("ThreadListItemRuntime is not available");
	return runtime;
}
/**
* @deprecated Use {@link useAuiState}: `useAuiState((s) => s.threadListItem)`. See the {@link https://assistant-ui.com/docs/migrations/v0-12 migration guide}.
*/
const useThreadListItem = createStateHookForRuntime(useThreadListItemRuntime);
//#endregion
export { useThreadListItem, useThreadListItemRuntime };

//# sourceMappingURL=ThreadListItemContext.js.map