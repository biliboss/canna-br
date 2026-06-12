"use client";
import { Primitive } from "../../utils/Primitive.js";
import { useAuiState } from "@assistant-ui/store";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
//#region src/primitives/suggestion/SuggestionDescription.tsx
/**
* Renders the description/label of the suggestion.
*
* @example
* ```tsx
* <SuggestionPrimitive.Description />
* ```
*/
const SuggestionPrimitiveDescription = forwardRef((props, ref) => {
	const label = useAuiState((s) => s.suggestion.label);
	return /* @__PURE__ */ jsx(Primitive.span, {
		...props,
		ref,
		children: props.children ?? label
	});
});
SuggestionPrimitiveDescription.displayName = "SuggestionPrimitive.Description";
//#endregion
export { SuggestionPrimitiveDescription };

//# sourceMappingURL=SuggestionDescription.js.map