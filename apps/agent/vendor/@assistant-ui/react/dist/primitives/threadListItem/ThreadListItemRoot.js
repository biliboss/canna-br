"use client";
import { Primitive } from "../../utils/Primitive.js";
import { useAuiState } from "@assistant-ui/store";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
//#region src/primitives/threadListItem/ThreadListItemRoot.tsx
const ThreadListItemPrimitiveRoot = forwardRef((props, ref) => {
	const isMain = useAuiState((s) => s.threads.mainThreadId === s.threadListItem.id);
	return /* @__PURE__ */ jsx(Primitive.div, {
		...isMain ? {
			"data-active": "true",
			"aria-current": "true"
		} : null,
		...props,
		ref
	});
});
ThreadListItemPrimitiveRoot.displayName = "ThreadListItemPrimitive.Root";
//#endregion
export { ThreadListItemPrimitiveRoot };

//# sourceMappingURL=ThreadListItemRoot.js.map