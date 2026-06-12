"use client";
import { useAuiState } from "@assistant-ui/store";
import { Fragment, jsx } from "react/jsx-runtime";
//#region src/primitives/branchPicker/BranchPickerCount.tsx
const useBranchPickerCount = () => {
	return useAuiState((s) => s.message.branchCount);
};
/**
* A component that displays the total number of branches for the current message.
*
* This component renders the branch count as plain text, useful for showing
* users how many alternative responses are available.
*
* @example
* ```tsx
* <div>
*   Branch <BranchPickerPrimitive.Count /> of {totalBranches}
* </div>
* ```
*/
const BranchPickerPrimitiveCount = () => {
	return /* @__PURE__ */ jsx(Fragment, { children: useBranchPickerCount() });
};
BranchPickerPrimitiveCount.displayName = "BranchPickerPrimitive.Count";
//#endregion
export { BranchPickerPrimitiveCount };

//# sourceMappingURL=BranchPickerCount.js.map