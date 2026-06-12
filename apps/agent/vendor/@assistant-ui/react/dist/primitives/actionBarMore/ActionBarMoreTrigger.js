"use client";
import { useDropdownMenuScope } from "./scope.js";
import { DropdownMenuRenderTrigger } from "../dropdownMenuRenderPrimitives.js";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
//#region src/primitives/actionBarMore/ActionBarMoreTrigger.tsx
const ActionBarMorePrimitiveTrigger = forwardRef(({ __scopeActionBarMore, ...rest }, ref) => {
	return /* @__PURE__ */ jsx(DropdownMenuRenderTrigger, {
		...useDropdownMenuScope(__scopeActionBarMore),
		...rest,
		ref
	});
});
ActionBarMorePrimitiveTrigger.displayName = "ActionBarMorePrimitive.Trigger";
//#endregion
export { ActionBarMorePrimitiveTrigger };

//# sourceMappingURL=ActionBarMoreTrigger.js.map