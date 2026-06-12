import { useMemo } from "@assistant-ui/tap/react-shim";
//#region src/legacy-runtime/runtime-cores/assistant-transport/useConvertedState.ts
function useConvertedState(converter, agentState, pendingCommands, isSending, toolStatuses) {
	return useMemo(() => converter(agentState, {
		pendingCommands,
		isSending,
		toolStatuses
	}), [
		converter,
		agentState,
		pendingCommands,
		isSending,
		toolStatuses
	]);
}
//#endregion
export { useConvertedState };

//# sourceMappingURL=useConvertedState.js.map