"use client";
import { DropdownMenuRenderTrigger } from "../dropdownMenuRenderPrimitives.js";
import { useDropdownMenuScope } from "./scope.js";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
//#region src/primitives/threadListItemMore/ThreadListItemMoreTrigger.tsx
const ThreadListItemMorePrimitiveTrigger = forwardRef(({ __scopeThreadListItemMore, ...rest }, ref) => {
	return /* @__PURE__ */ jsx(DropdownMenuRenderTrigger, {
		...useDropdownMenuScope(__scopeThreadListItemMore),
		...rest,
		ref
	});
});
ThreadListItemMorePrimitiveTrigger.displayName = "ThreadListItemMorePrimitive.Trigger";
//#endregion
export { ThreadListItemMorePrimitiveTrigger };

//# sourceMappingURL=ThreadListItemMoreTrigger.js.map