"use client";
import { useDropdownMenuScope } from "./scope.js";
import { DropdownMenuRenderSeparator } from "../dropdownMenuRenderPrimitives.js";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
//#region src/primitives/actionBarMore/ActionBarMoreSeparator.tsx
const ActionBarMorePrimitiveSeparator = forwardRef(({ __scopeActionBarMore, ...rest }, ref) => {
	return /* @__PURE__ */ jsx(DropdownMenuRenderSeparator, {
		...useDropdownMenuScope(__scopeActionBarMore),
		...rest,
		ref
	});
});
ActionBarMorePrimitiveSeparator.displayName = "ActionBarMorePrimitive.Separator";
//#endregion
export { ActionBarMorePrimitiveSeparator };

//# sourceMappingURL=ActionBarMoreSeparator.js.map