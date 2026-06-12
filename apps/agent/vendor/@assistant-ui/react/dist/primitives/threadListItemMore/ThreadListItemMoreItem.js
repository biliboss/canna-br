"use client";
import { DropdownMenuRenderItem } from "../dropdownMenuRenderPrimitives.js";
import { useDropdownMenuScope } from "./scope.js";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
//#region src/primitives/threadListItemMore/ThreadListItemMoreItem.tsx
const ThreadListItemMorePrimitiveItem = forwardRef(({ __scopeThreadListItemMore, ...rest }, ref) => {
	return /* @__PURE__ */ jsx(DropdownMenuRenderItem, {
		...useDropdownMenuScope(__scopeThreadListItemMore),
		...rest,
		ref
	});
});
ThreadListItemMorePrimitiveItem.displayName = "ThreadListItemMorePrimitive.Item";
//#endregion
export { ThreadListItemMorePrimitiveItem };

//# sourceMappingURL=ThreadListItemMoreItem.js.map