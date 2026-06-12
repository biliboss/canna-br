"use client";
import { Primitive } from "../../utils/Primitive.js";
import { useAuiState } from "@assistant-ui/store";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
//#region src/primitives/suggestion/SuggestionTitle.tsx
/**
* Renders the title of the suggestion.
*
* @example
* ```tsx
* <SuggestionPrimitive.Title />
* ```
*/
const SuggestionPrimitiveTitle = forwardRef((props, ref) => {
	const title = useAuiState((s) => s.suggestion.title);
	return /* @__PURE__ */ jsx(Primitive.span, {
		...props,
		ref,
		children: props.children ?? title
	});
});
SuggestionPrimitiveTitle.displayName = "SuggestionPrimitive.Title";
//#endregion
export { SuggestionPrimitiveTitle };

//# sourceMappingURL=SuggestionTitle.js.map