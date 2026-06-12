"use client";
import { useDropdownMenuScope } from "./scope.js";
import { DropdownMenuRenderContent } from "../dropdownMenuRenderPrimitives.js";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { DropdownMenu } from "radix-ui";
//#region src/primitives/actionBarMore/ActionBarMoreContent.tsx
const ActionBarMorePrimitiveContent = forwardRef(({ __scopeActionBarMore, portalProps, sideOffset = 4, ...props }, forwardedRef) => {
	const scope = useDropdownMenuScope(__scopeActionBarMore);
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
ActionBarMorePrimitiveContent.displayName = "ActionBarMorePrimitive.Content";
//#endregion
export { ActionBarMorePrimitiveContent };

//# sourceMappingURL=ActionBarMoreContent.js.map