"use client";
import { Primitive } from "../../utils/Primitive.js";
import { useAui, useAuiState } from "@assistant-ui/store";
import { forwardRef, useCallback } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { composeEventHandlers } from "@radix-ui/primitive";
//#region src/primitives/composer/ComposerQuote.tsx
/**
* Renders a container for the quoted text preview in the composer.
* Only renders when a quote is set.
*
* @example
* ```tsx
* <ComposerPrimitive.Quote>
*   <ComposerPrimitive.QuoteText />
*   <ComposerPrimitive.QuoteDismiss>×</ComposerPrimitive.QuoteDismiss>
* </ComposerPrimitive.Quote>
* ```
*/
const ComposerPrimitiveQuote = forwardRef((props, forwardedRef) => {
	if (!useAuiState((s) => s.composer.quote)) return null;
	return /* @__PURE__ */ jsx(Primitive.div, {
		...props,
		ref: forwardedRef
	});
});
ComposerPrimitiveQuote.displayName = "ComposerPrimitive.Quote";
/**
* Renders the quoted text content.
*
* @example
* ```tsx
* <ComposerPrimitive.QuoteText />
* ```
*/
const ComposerPrimitiveQuoteText = forwardRef(({ children, ...props }, forwardedRef) => {
	const text = useAuiState((s) => s.composer.quote?.text);
	if (!text) return null;
	return /* @__PURE__ */ jsx(Primitive.span, {
		...props,
		ref: forwardedRef,
		children: children ?? text
	});
});
ComposerPrimitiveQuoteText.displayName = "ComposerPrimitive.QuoteText";
/**
* A button that clears the current quote from the composer.
*
* @example
* ```tsx
* <ComposerPrimitive.QuoteDismiss>×</ComposerPrimitive.QuoteDismiss>
* ```
*/
const ComposerPrimitiveQuoteDismiss = forwardRef(({ onClick, ...props }, forwardedRef) => {
	const aui = useAui();
	const handleDismiss = useCallback(() => {
		aui.composer().setQuote(void 0);
	}, [aui]);
	return /* @__PURE__ */ jsx(Primitive.button, {
		type: "button",
		...props,
		ref: forwardedRef,
		onClick: composeEventHandlers(onClick, handleDismiss)
	});
});
ComposerPrimitiveQuoteDismiss.displayName = "ComposerPrimitive.QuoteDismiss";
//#endregion
export { ComposerPrimitiveQuote, ComposerPrimitiveQuoteDismiss, ComposerPrimitiveQuoteText };

//# sourceMappingURL=ComposerQuote.js.map