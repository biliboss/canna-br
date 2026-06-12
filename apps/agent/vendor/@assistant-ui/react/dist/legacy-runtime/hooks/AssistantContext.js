"use client";
import { createStateHookForRuntime } from "../../context/react/utils/createStateHookForRuntime.js";
import { useAui } from "@assistant-ui/store";
//#region src/legacy-runtime/hooks/AssistantContext.ts
function useAssistantRuntime(options) {
	const runtime = useAui().threads().__internal_getAssistantRuntime?.() ?? null;
	if (!runtime && !options?.optional) throw new Error("AssistantRuntime is not available");
	return runtime;
}
const useThreadListRuntime = (opt) => useAssistantRuntime(opt)?.threads ?? null;
/**
* @deprecated Use {@link useAuiState}: `useAuiState((s) => s.threads)`. See the {@link https://assistant-ui.com/docs/migrations/v0-12 migration guide}.
*/
const useThreadList = createStateHookForRuntime(useThreadListRuntime);
//#endregion
export { useAssistantRuntime, useThreadList };

//# sourceMappingURL=AssistantContext.js.map