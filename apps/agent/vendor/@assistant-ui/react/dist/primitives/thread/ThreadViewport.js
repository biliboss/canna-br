"use client";
import { useThreadViewport, useThreadViewportStore } from "../../context/react/ThreadViewportContext.js";
import { ThreadPrimitiveViewportProvider } from "../../context/providers/ThreadViewportProvider.js";
import { Primitive } from "../../utils/Primitive.js";
import { useManagedRef } from "../../utils/hooks/useManagedRef.js";
import { useThreadViewportAutoScroll } from "./useThreadViewportAutoScroll.js";
import { useSizeHandle } from "../../utils/hooks/useSizeHandle.js";
import { useTopAnchorReserve } from "./topAnchor/useTopAnchorReserve.js";
import { getActiveTopAnchorAnchorId, getActiveTopAnchorTargetId } from "./topAnchor/topAnchorTurn.js";
import { useAuiEvent, useAuiState } from "@assistant-ui/store";
import { forwardRef, useCallback, useLayoutEffect, useMemo } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { useComposedRefs } from "@radix-ui/react-compose-refs";
//#region src/primitives/thread/ThreadViewport.tsx
const useViewportSizeRef = () => {
	return useSizeHandle(useThreadViewport((s) => s.registerViewport), useCallback((el) => el.clientHeight, []));
};
const useViewportElementRef = () => {
	return useManagedRef(useThreadViewport((s) => s.registerViewportElement));
};
const useTopAnchorTurn = (enabled) => {
	const threadViewportStore = useThreadViewportStore();
	const activeAnchorId = useAuiState((s) => {
		if (!enabled) return void 0;
		return getActiveTopAnchorAnchorId(s.thread);
	});
	const activeTargetId = useAuiState((s) => {
		if (!enabled) return void 0;
		return getActiveTopAnchorTargetId(s.thread);
	});
	const activeTurn = useMemo(() => {
		if (!activeAnchorId || !activeTargetId) return null;
		return {
			anchorId: activeAnchorId,
			targetId: activeTargetId
		};
	}, [activeAnchorId, activeTargetId]);
	useLayoutEffect(() => {
		if (!activeTurn) return;
		const state = threadViewportStore.getState();
		const current = state.topAnchorTurn;
		if (current?.anchorId === activeTurn.anchorId && current.targetId === activeTurn.targetId) return;
		state.setTopAnchorTurn(activeTurn);
	}, [activeTurn, threadViewportStore]);
	const clearTopAnchorTurn = useCallback(() => {
		threadViewportStore.getState().setTopAnchorTurn(null);
	}, [threadViewportStore]);
	useAuiEvent("thread.initialize", clearTopAnchorTurn);
	useAuiEvent("threadListItem.switchedTo", clearTopAnchorTurn);
};
const ThreadPrimitiveViewportScrollable = forwardRef(({ autoScroll, scrollToBottomOnRunStart, scrollToBottomOnInitialize, scrollToBottomOnThreadSwitch, children, ...rest }, forwardedRef) => {
	const autoScrollRef = useThreadViewportAutoScroll({
		autoScroll,
		scrollToBottomOnRunStart,
		scrollToBottomOnInitialize,
		scrollToBottomOnThreadSwitch
	});
	const viewportSizeRef = useViewportSizeRef();
	const viewportElementRef = useViewportElementRef();
	const topAnchorEnabled = useThreadViewportStore().getState().turnAnchor === "top";
	useTopAnchorTurn(topAnchorEnabled);
	useTopAnchorReserve(topAnchorEnabled);
	const ref = useComposedRefs(forwardedRef, autoScrollRef, viewportSizeRef, viewportElementRef);
	return /* @__PURE__ */ jsx(Primitive.div, {
		...rest,
		ref,
		children
	});
});
ThreadPrimitiveViewportScrollable.displayName = "ThreadPrimitive.ViewportScrollable";
/**
* A scrollable viewport container for thread messages.
*
* This component provides a scrollable area for displaying thread messages with
* automatic scrolling capabilities. It manages the viewport state and provides
* context for child components to access viewport-related functionality.
*
* @example
* ```tsx
* <ThreadPrimitive.Viewport turnAnchor="top">
*   <ThreadPrimitive.Messages>
*     {() => <MyMessage />}
*   </ThreadPrimitive.Messages>
* </ThreadPrimitive.Viewport>
* ```
*/
const ThreadPrimitiveViewport = forwardRef(({ turnAnchor, topAnchorMessageClamp, ...props }, ref) => {
	return /* @__PURE__ */ jsx(ThreadPrimitiveViewportProvider, {
		options: {
			turnAnchor,
			topAnchorMessageClamp
		},
		children: /* @__PURE__ */ jsx(ThreadPrimitiveViewportScrollable, {
			...props,
			ref
		})
	});
});
ThreadPrimitiveViewport.displayName = "ThreadPrimitive.Viewport";
//#endregion
export { ThreadPrimitiveViewport };

//# sourceMappingURL=ThreadViewport.js.map