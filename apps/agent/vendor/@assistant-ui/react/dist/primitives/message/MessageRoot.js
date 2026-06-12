"use client";
import { useThreadViewport, useThreadViewportStore } from "../../context/react/ThreadViewportContext.js";
import { Primitive } from "../../utils/Primitive.js";
import { useManagedRef } from "../../utils/hooks/useManagedRef.js";
import { parseCssLength } from "../thread/topAnchor/topAnchorUtils.js";
import { useAui, useAuiState } from "@assistant-ui/store";
import { forwardRef, useCallback } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { useComposedRefs } from "@radix-ui/react-compose-refs";
//#region src/primitives/message/MessageRoot.tsx
const useIsHoveringRef = () => {
	const aui = useAui();
	const message = useAuiState(() => aui.message());
	return useManagedRef(useCallback((el) => {
		const handleMouseEnter = () => {
			message.setIsHovering(true);
		};
		const handleMouseLeave = () => {
			message.setIsHovering(false);
		};
		el.addEventListener("mouseenter", handleMouseEnter);
		el.addEventListener("mouseleave", handleMouseLeave);
		if (el.matches(":hover")) queueMicrotask(() => message.setIsHovering(true));
		return () => {
			el.removeEventListener("mouseenter", handleMouseEnter);
			el.removeEventListener("mouseleave", handleMouseLeave);
			message.setIsHovering(false);
		};
	}, [message]));
};
const useIsTopAnchorUser = () => {
	const activeAnchorId = useThreadViewport((s) => s.topAnchorTurn?.anchorId);
	return useAuiState((s) => s.message.role === "user" && s.message.index > 0 && s.message.index === s.thread.messages.length - 2 && s.thread.messages.at(-1)?.role === "assistant" && (s.message.id === activeAnchorId || s.thread.isRunning));
};
const useIsTopAnchorTarget = () => {
	const activeTargetId = useThreadViewport((s) => s.topAnchorTurn?.targetId);
	return useAuiState((s) => s.message.isLast && s.message.role === "assistant" && s.message.index >= 1 && s.thread.messages.at(s.message.index - 1)?.role === "user" && (s.message.id === activeTargetId || s.thread.isRunning));
};
const useTopAnchorUserRef = (active, threadViewportStore) => {
	return useManagedRef(useCallback((el) => {
		if (!active) return;
		return threadViewportStore.getState().registerAnchorElement(el);
	}, [active, threadViewportStore]));
};
const useTopAnchorTargetRef = ({ active, threadViewportStore }) => {
	return useManagedRef(useCallback((el) => {
		if (!active) return;
		const state = threadViewportStore.getState();
		const clamp = state.topAnchorMessageClamp;
		return state.registerAnchorTargetElement(el, {
			tallerThan: parseCssLength(clamp.tallerThan, el),
			visibleHeight: parseCssLength(clamp.visibleHeight, el)
		});
	}, [active, threadViewportStore]));
};
const MessagePrimitiveRootDefault = ({ forwardedRef, ...props }) => {
	const ref = useComposedRefs(forwardedRef, useIsHoveringRef());
	const messageId = useAuiState((s) => s.message.id);
	return /* @__PURE__ */ jsx(Primitive.div, {
		...props,
		ref,
		"data-message-id": messageId
	});
};
const MessagePrimitiveRootTopAnchor = ({ forwardedRef, threadViewportStore, ...props }) => {
	const isHoveringRef = useIsHoveringRef();
	const isTopAnchorUser = useIsTopAnchorUser();
	const isTopAnchorTarget = useIsTopAnchorTarget();
	const ref = useComposedRefs(forwardedRef, isHoveringRef, useTopAnchorUserRef(isTopAnchorUser, threadViewportStore), useTopAnchorTargetRef({
		active: isTopAnchorTarget,
		threadViewportStore
	}));
	const messageId = useAuiState((s) => s.message.id);
	return /* @__PURE__ */ jsx(Primitive.div, {
		...props,
		ref,
		"data-message-id": messageId,
		"data-aui-top-anchor-user": isTopAnchorUser ? "" : void 0,
		"data-aui-top-anchor-target": isTopAnchorTarget ? "" : void 0
	});
};
/**
* The root container component for a message.
*
* This component provides the foundational wrapper for message content and handles
* hover state management for the message. It automatically tracks when the user
* is hovering over the message, which can be used by child components like action bars.
*
* When `turnAnchor="top"` is set on the viewport, this component automatically
* registers itself as the top-anchor user message (when it's the previous user
* message) or as the top-anchor target (when it's the streaming assistant
* response). No additional component is required.
*
* @example
* ```tsx
* <MessagePrimitive.Root>
*   <MessagePrimitive.Content />
*   <ActionBarPrimitive.Root>
*     <ActionBarPrimitive.Copy />
*     <ActionBarPrimitive.Edit />
*   </ActionBarPrimitive.Root>
* </MessagePrimitive.Root>
* ```
*/
const MessagePrimitiveRoot = forwardRef((props, forwardedRef) => {
	const threadViewportStore = useThreadViewportStore();
	if (threadViewportStore.getState().turnAnchor === "top") return /* @__PURE__ */ jsx(MessagePrimitiveRootTopAnchor, {
		...props,
		forwardedRef,
		threadViewportStore
	});
	return /* @__PURE__ */ jsx(MessagePrimitiveRootDefault, {
		...props,
		forwardedRef
	});
});
MessagePrimitiveRoot.displayName = "MessagePrimitive.Root";
//#endregion
export { MessagePrimitiveRoot };

//# sourceMappingURL=MessageRoot.js.map