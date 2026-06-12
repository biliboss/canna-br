"use client";
import { useRemoteThreadListRuntime } from "../runtime-cores/remote-thread-list/useRemoteThreadListRuntime.js";
import { useCloudThreadListAdapter } from "../runtime-cores/remote-thread-list/adapter/cloud.js";
//#region src/legacy-runtime/cloud/useCloudThreadListRuntime.ts
function useCloudThreadListRuntime({ runtimeHook, ...adapterOptions }) {
	return useRemoteThreadListRuntime({
		runtimeHook,
		adapter: useCloudThreadListAdapter(adapterOptions),
		allowNesting: true
	});
}
//#endregion
export { useCloudThreadListRuntime };

//# sourceMappingURL=useCloudThreadListRuntime.js.map