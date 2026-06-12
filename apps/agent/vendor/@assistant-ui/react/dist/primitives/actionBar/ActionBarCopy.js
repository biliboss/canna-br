"use client";
import { Primitive } from "../../utils/Primitive.js";
import { useAuiState } from "@assistant-ui/store";
import { useActionBarCopy } from "@assistant-ui/core/react";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { composeEventHandlers } from "@radix-ui/primitive";
//#region src/primitives/actionBar/ActionBarCopy.tsx
/**
* Hook that provides copy functionality for action bar buttons.
*
* This hook returns a callback function that copies message content to the clipboard,
* or null if copying is not available. It handles both regular message content and
* composer text when in editing mode.
*
* @param options Configuration options
* @param options.copiedDuration Duration in milliseconds to show the copied state
* @returns A copy callback function, or null if copying is disabled
*
* @example
* ```tsx
* function CustomCopyButton() {
*   const copy = useActionBarPrimitiveCopy({ copiedDuration: 2000 });
*
*   return (
*     <button onClick={copy} disabled={!copy}>
*       {copy ? "Copy" : "Cannot Copy"}
*     </button>
*   );
* }
* ```
*/
const useActionBarPrimitiveCopy = ({ copiedDuration = 3e3 } = {}) => {
	const { copy, disabled } = useActionBarCopy({
		copiedDuration,
		copyToClipboard: (text) => {
			if (typeof navigator === "undefined" || !navigator.clipboard) return Promise.reject(/* @__PURE__ */ new Error("Clipboard API is unavailable"));
			return navigator.clipboard.writeText(text);
		}
	});
	if (disabled) return null;
	return copy;
};
/**
* A button component that copies message content to the clipboard.
*
* This component automatically handles copying message text to the clipboard
* and provides visual feedback through the data-copied attribute. It's disabled
* when there's no copyable content available.
*
* @example
* ```tsx
* <ActionBarPrimitive.Copy copiedDuration={2000}>
*   Copy Message
* </ActionBarPrimitive.Copy>
* ```
*/
const ActionBarPrimitiveCopy = forwardRef(({ copiedDuration, onClick, disabled, ...props }, forwardedRef) => {
	const isCopied = useAuiState((s) => s.message.isCopied);
	const callback = useActionBarPrimitiveCopy({ copiedDuration });
	return /* @__PURE__ */ jsx(Primitive.button, {
		type: "button",
		...isCopied ? { "data-copied": "true" } : {},
		...props,
		ref: forwardedRef,
		disabled: disabled || !callback,
		onClick: composeEventHandlers(onClick, () => {
			callback?.();
		})
	});
});
ActionBarPrimitiveCopy.displayName = "ActionBarPrimitive.Copy";
//#endregion
export { ActionBarPrimitiveCopy };

//# sourceMappingURL=ActionBarCopy.js.map