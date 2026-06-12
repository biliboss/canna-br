"use client";
import { DropdownMenuRenderContent } from "../dropdownMenuRenderPrimitives.js";
import { useDropdownMenuScope } from "./scope.js";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { DropdownMenu } from "radix-ui";
//#region src/primitives/threadListItemMore/ThreadListItemMoreContent.tsx
const ThreadListItemMorePrimitiveContent = forwardRef(({ __scopeThreadListItemMore, portalProps, sideOffset = 4, ...props }, forwardedRef) => {
	const scope = useDropdownMenuScope(__scopeThreadListItemMore);
	return /* @__PURE__ */ jsx(DropdownMenu.Portal, {
		...scope,
		...portalProps,
		children: /* @__PURE__ */ jsx(DropdownMenuRenderContent, {
			...scope,
			...props,
			ref: forwardedRef,
			sideOffset
		})
	});
});
ThreadListItemMorePrimitiveContent.displayName = "ThreadListItemMorePrimitive.Content";
//#endregion
export { ThreadListItemMorePrimitiveContent };

//# sourceMappingURL=ThreadListItemMoreContent.js.map