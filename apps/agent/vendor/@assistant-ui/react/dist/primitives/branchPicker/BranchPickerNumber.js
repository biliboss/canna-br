"use client";
import { useAuiState } from "@assistant-ui/store";
import { Fragment, jsx } from "react/jsx-runtime";
//#region src/primitives/branchPicker/BranchPickerNumber.tsx
const useBranchPickerNumber = () => {
	return useAuiState((s) => s.message.branchNumber);
};
const BranchPickerPrimitiveNumber = () => {
	return /* @__PURE__ */ jsx(Fragment, { children: useBranchPickerNumber() });
};
BranchPickerPrimitiveNumber.displayName = "BranchPickerPrimitive.Number";
//#endregion
export { BranchPickerPrimitiveNumber };

//# sourceMappingURL=BranchPickerNumber.js.map