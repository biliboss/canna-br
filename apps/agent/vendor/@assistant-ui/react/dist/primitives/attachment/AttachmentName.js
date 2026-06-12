"use client";
import { useAuiState } from "@assistant-ui/store";
import { Fragment, jsx } from "react/jsx-runtime";
//#region src/primitives/attachment/AttachmentName.tsx
const AttachmentPrimitiveName = () => {
	return /* @__PURE__ */ jsx(Fragment, { children: useAuiState((s) => s.attachment.name) });
};
AttachmentPrimitiveName.displayName = "AttachmentPrimitive.Name";
//#endregion
export { AttachmentPrimitiveName };

//# sourceMappingURL=AttachmentName.js.map