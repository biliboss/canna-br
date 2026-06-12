"use client";
import { Primitive } from "../../utils/Primitive.js";
import { MessagePrimitiveIf } from "../message/MessageIf.js";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
//#region src/primitives/branchPicker/BranchPickerRoot.tsx
/**
* The root container for branch picker components.
*
* This component provides a container for branch navigation controls,
* with optional conditional rendering based on the number of available branches.
* It integrates with the message branching system to allow users to navigate
* between different response variations.
*
* @example
* ```tsx
* <BranchPickerPrimitive.Root hideWhenSingleBranch={true}>
*   <BranchPickerPrimitive.Previous />
*   <BranchPickerPrimitive.Count />
*   <BranchPickerPrimitive.Next />
* </BranchPickerPrimitive.Root>
* ```
*/
const BranchPickerPrimitiveRoot = forwardRef(({ hideWhenSingleBranch, ...rest }, ref) => {
	return /* @__PURE__ */ jsx(MessagePrimitiveIf, {
		hasBranches: hideWhenSingleBranch ? true : void 0,
		children: /* @__PURE__ */ jsx(Primitive.div, {
			...rest,
			ref
		})
	});
});
BranchPickerPrimitiveRoot.displayName = "BranchPickerPrimitive.Root";
//#endregion
export { BranchPickerPrimitiveRoot };

//# sourceMappingURL=BranchPickerRoot.js.map