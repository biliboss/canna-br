"use client";
import { DropdownMenuRenderSeparator } from "../dropdownMenuRenderPrimitives.js";
import { useDropdownMenuScope } from "./scope.js";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
//#region src/primitives/threadListItemMore/ThreadListItemMoreSeparator.tsx
const ThreadListItemMorePrimitiveSeparator = forwardRef(({ __scopeThreadListItemMore, ...rest }, ref) => {
	return /* @__PURE__ */ jsx(DropdownMenuRenderSeparator, {
		...useDropdownMenuScope(__scopeThreadListItemMore),
		...rest,
		ref
	});
});
ThreadListItemMorePrimitiveSeparator.displayName = "ThreadListItemMorePrimitive.Separator";
//#endregion
export { ThreadListItemMorePrimitiveSeparator };

//# sourceMappingURL=ThreadListItemMoreSeparator.js.map