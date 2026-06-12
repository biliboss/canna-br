"use client";
import { ThreadPrimitiveViewportProvider } from "../context/providers/ThreadViewportProvider.js";
import { DevToolsProviderApi } from "../devtools/DevToolsHooks.js";
import { useAui } from "@assistant-ui/store";
import { AssistantProviderBase } from "@assistant-ui/core/react";
import { memo, useEffect } from "@assistant-ui/tap/react-shim";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/legacy-runtime/AssistantRuntimeProvider.tsx
const DevToolsRegistration = () => {
	const aui = useAui();
	useEffect(() => {
		if (typeof process === "undefined" || process.env.NODE_ENV === "production") return;
		return DevToolsProviderApi.register(aui);
	}, [aui]);
	return null;
};
const AssistantRuntimeProviderImpl = ({ children, aui, runtime }) => {
	return /* @__PURE__ */ jsxs(AssistantProviderBase, {
		runtime,
		aui: aui ?? null,
		children: [/* @__PURE__ */ jsx(DevToolsRegistration, {}), /* @__PURE__ */ jsx(ThreadPrimitiveViewportProvider, { children })]
	});
};
const AssistantRuntimeProvider = memo(AssistantRuntimeProviderImpl);
//#endregion
export { AssistantRuntimeProvider, AssistantRuntimeProviderImpl };

//# sourceMappingURL=AssistantRuntimeProvider.js.map