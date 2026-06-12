"use client";
import { useDropdownMenuScope } from "./scope.js";
import { DropdownMenuRenderItem } from "../dropdownMenuRenderPrimitives.js";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
//#region src/primitives/actionBarMore/ActionBarMoreItem.tsx
const ActionBarMorePrimitiveItem = forwardRef(({ __scopeActionBarMore, ...rest }, ref) => {
	return /* @__PURE__ */ jsx(DropdownMenuRenderItem, {
		...useDropdownMenuScope(__scopeActionBarMore),
		...rest,
		ref
	});
});
ActionBarMorePrimitiveItem.displayName = "ActionBarMorePrimitive.Item";
//#endregion
export { ActionBarMorePrimitiveItem };

//# sourceMappingURL=ActionBarMoreItem.js.map