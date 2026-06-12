"use client";
import { Primitive } from "../../utils/Primitive.js";
import { useSelectionToolbarInfo } from "./SelectionToolbarRoot.js";
import { useAui } from "@assistant-ui/store";
import { forwardRef, useCallback } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { composeEventHandlers } from "@radix-ui/primitive";
//#region src/primitives/selectionToolbar/SelectionToolbarQuote.tsx
/**
* A button that quotes the currently selected text.
*
* Must be placed inside `SelectionToolbarPrimitive.Root`. Reads the
* selection info from context (captured by the Root), sets it as a
* quote in the thread composer, and clears the selection.
*
* @example
* ```tsx
* <SelectionToolbarPrimitive.Quote>
*   <QuoteIcon /> Quote
* </SelectionToolbarPrimitive.Quote>
* ```
*/
const SelectionToolbarPrimitiveQuote = forwardRef(({ onClick, disabled, ...props }, forwardedRef) => {
	const aui = useAui();
	const info = useSelectionToolbarInfo();
	const handleClick = useCallback(() => {
		if (!info) return;
		aui.thread().composer().setQuote({
			text: info.text,
			messageId: info.messageId
		});
		window.getSelection()?.removeAllRanges();
	}, [aui, info]);
	return /* @__PURE__ */ jsx(Primitive.button, {
		type: "button",
		...props,
		ref: forwardedRef,
		disabled: disabled || !info,
		onClick: composeEventHandlers(onClick, handleClick)
	});
});
SelectionToolbarPrimitiveQuote.displayName = "SelectionToolbarPrimitive.Quote";
//#endregion
export { SelectionToolbarPrimitiveQuote };

//# sourceMappingURL=SelectionToolbarQuote.js.map