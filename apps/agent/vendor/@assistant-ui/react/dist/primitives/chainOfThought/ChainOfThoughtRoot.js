"use client";
import { Primitive } from "../../utils/Primitive.js";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
//#region src/primitives/chainOfThought/ChainOfThoughtRoot.tsx
/**
* The root container for chain of thought components.
*
* This component provides a wrapper for chain of thought content,
* including reasoning and tool-call parts that can be collapsed in an accordion.
*
* @example
* ```tsx
* <ChainOfThoughtPrimitive.Root>
*   <ChainOfThoughtPrimitive.AccordionTrigger>
*     Toggle reasoning
*   </ChainOfThoughtPrimitive.AccordionTrigger>
*   <ChainOfThoughtPrimitive.Parts />
* </ChainOfThoughtPrimitive.Root>
* ```
*/
const ChainOfThoughtPrimitiveRoot = forwardRef((props, ref) => {
	return /* @__PURE__ */ jsx(Primitive.div, {
		...props,
		ref
	});
});
ChainOfThoughtPrimitiveRoot.displayName = "ChainOfThoughtPrimitive.Root";
//#endregion
export { ChainOfThoughtPrimitiveRoot };

//# sourceMappingURL=ChainOfThoughtRoot.js.map