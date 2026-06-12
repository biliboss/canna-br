"use client";
import { useThreadViewport } from "../../context/react/ThreadViewportContext.js";
import { useEffect } from "@assistant-ui/tap/react-shim";
import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
//#region src/utils/hooks/useOnScrollToBottom.ts
const useOnScrollToBottom = (callback) => {
	const callbackRef = useCallbackRef(callback);
	const onScrollToBottom = useThreadViewport((vp) => vp.onScrollToBottom);
	useEffect(() => {
		return onScrollToBottom(callbackRef);
	}, [onScrollToBottom, callbackRef]);
};
//#endregion
export { useOnScrollToBottom };

//# sourceMappingURL=useOnScrollToBottom.js.map