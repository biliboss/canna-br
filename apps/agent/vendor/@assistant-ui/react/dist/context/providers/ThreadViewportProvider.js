"use client";
import { makeThreadViewportStore } from "../stores/ThreadViewport.js";
import { ThreadViewportContext, useThreadViewportStore } from "../react/ThreadViewportContext.js";
import { writableStore } from "../ReadonlyStore.js";
import { useEffect, useState } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
//#region src/context/providers/ThreadViewportProvider.tsx
const useThreadViewportStoreValue = (options) => {
	const outerViewport = useThreadViewportStore({ optional: true });
	const [store] = useState(() => makeThreadViewportStore(options));
	useEffect(() => {
		return outerViewport?.getState().onScrollToBottom(() => {
			store.getState().scrollToBottom();
		});
	}, [outerViewport, store]);
	useEffect(() => {
		if (!outerViewport) return;
		return store.subscribe((state) => {
			if (outerViewport.getState().isAtBottom !== state.isAtBottom) writableStore(outerViewport).setState({ isAtBottom: state.isAtBottom });
		});
	}, [store, outerViewport]);
	return store;
};
const ThreadPrimitiveViewportProvider = ({ children, options = {} }) => {
	const useThreadViewport = useThreadViewportStoreValue(options);
	const [context] = useState(() => {
		return { useThreadViewport };
	});
	return /* @__PURE__ */ jsx(ThreadViewportContext.Provider, {
		value: context,
		children
	});
};
//#endregion
export { ThreadPrimitiveViewportProvider };

//# sourceMappingURL=ThreadViewportProvider.js.map