"use client";
import { useThreadViewport, useThreadViewportStore } from "../../context/react/ThreadViewportContext.js";
import { createActionButton } from "../../utils/createActionButton.js";
import { useCallback } from "@assistant-ui/tap/react-shim";
//#region src/primitives/thread/ThreadScrollToBottom.ts
const useThreadScrollToBottom = ({ behavior } = {}) => {
	const isAtBottom = useThreadViewport((s) => s.isAtBottom);
	const threadViewportStore = useThreadViewportStore();
	const handleScrollToBottom = useCallback(() => {
		threadViewportStore.getState().scrollToBottom({ behavior });
	}, [threadViewportStore, behavior]);
	if (isAtBottom) return null;
	return handleScrollToBottom;
};
const ThreadPrimitiveScrollToBottom = createActionButton("ThreadPrimitive.ScrollToBottom", useThreadScrollToBottom, ["behavior"]);
//#endregion
export { ThreadPrimitiveScrollToBottom };

//# sourceMappingURL=ThreadScrollToBottom.js.map