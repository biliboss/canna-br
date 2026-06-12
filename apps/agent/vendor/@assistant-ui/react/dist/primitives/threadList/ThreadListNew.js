"use client";
import { Primitive } from "../../utils/Primitive.js";
import { useAuiState } from "@assistant-ui/store";
import { useThreadListNew } from "@assistant-ui/core/react";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { composeEventHandlers } from "@radix-ui/primitive";
//#region src/primitives/threadList/ThreadListNew.tsx
const ThreadListPrimitiveNew = forwardRef(({ onClick, disabled, ...props }, forwardedRef) => {
	const isMain = useAuiState((s) => s.threads.newThreadId === s.threads.mainThreadId);
	const { switchToNewThread } = useThreadListNew();
	return /* @__PURE__ */ jsx(Primitive.button, {
		type: "button",
		...isMain ? {
			"data-active": "true",
			"aria-current": "true"
		} : null,
		...props,
		ref: forwardedRef,
		disabled,
		onClick: composeEventHandlers(onClick, switchToNewThread)
	});
});
ThreadListPrimitiveNew.displayName = "ThreadListPrimitive.New";
//#endregion
export { ThreadListPrimitiveNew };

//# sourceMappingURL=ThreadListNew.js.map