"use client";
import { createStateHookForRuntime } from "../../context/react/utils/createStateHookForRuntime.js";
import { useAui, useAuiState } from "@assistant-ui/store";
//#region src/legacy-runtime/hooks/MessagePartContext.ts
function useMessagePartRuntime(options) {
	const aui = useAui();
	const runtime = useAuiState(() => aui.part.source ? aui.part().__internal_getRuntime?.() ?? null : null);
	if (!runtime && !options?.optional) throw new Error("MessagePartRuntime is not available");
	return runtime;
}
/**
* @deprecated Use {@link useAuiState}: `useAuiState((s) => s.part)`. See the {@link https://assistant-ui.com/docs/migrations/v0-12 migration guide}.
*/
const useMessagePart = createStateHookForRuntime(useMessagePartRuntime);
//#endregion
export { useMessagePart, useMessagePartRuntime };

//# sourceMappingURL=MessagePartContext.js.map