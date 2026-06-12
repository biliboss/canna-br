"use client";
import { Primitive } from "../../../utils/Primitive.js";
import { useTriggerPopoverScopeContext } from "./TriggerPopover.js";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { composeEventHandlers } from "@radix-ui/primitive";
//#region src/primitives/composer/trigger/TriggerPopoverBack.tsx
/**
* A button that navigates back from category items to the category list.
* Only renders when a category is active (drill-down view).
*/
const ComposerPrimitiveTriggerPopoverBack = forwardRef(({ onClick, ...props }, forwardedRef) => {
	const { activeCategoryId, isSearchMode, goBack, open } = useTriggerPopoverScopeContext();
	if (!open || !activeCategoryId || isSearchMode) return null;
	return /* @__PURE__ */ jsx(Primitive.button, {
		type: "button",
		...props,
		ref: forwardedRef,
		onClick: composeEventHandlers(onClick, goBack)
	});
});
ComposerPrimitiveTriggerPopoverBack.displayName = "ComposerPrimitive.TriggerPopoverBack";
//#endregion
export { ComposerPrimitiveTriggerPopoverBack };

//# sourceMappingURL=TriggerPopoverBack.js.map