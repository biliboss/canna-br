import { ensureBinding } from "./ensureBinding.js";
import { useDebugValue, useSyncExternalStore } from "@assistant-ui/tap/react-shim";
//#region src/context/react/utils/useRuntimeState.ts
function useRuntimeStateInternal(runtime, selector = identity) {
	ensureBinding(runtime);
	const slice = useSyncExternalStore(runtime.subscribe, () => selector(runtime.getState()), () => selector(runtime.getState()));
	useDebugValue(slice);
	return slice;
}
const identity = (arg) => arg;
function useRuntimeState(runtime, selector) {
	return useRuntimeStateInternal(runtime, selector);
}
//#endregion
export { useRuntimeState, useRuntimeStateInternal };

//# sourceMappingURL=useRuntimeState.js.map