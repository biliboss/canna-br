"use client";
import { Primitive } from "../../utils/Primitive.js";
import { useAuiState } from "@assistant-ui/store";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsxs } from "react/jsx-runtime";
//#region src/primitives/attachment/AttachmentThumb.tsx
const AttachmentPrimitiveThumb = forwardRef((props, ref) => {
	const ext = useAuiState((s) => {
		const parts = s.attachment.name.split(".");
		return parts.length > 1 ? parts.pop() : "";
	});
	return /* @__PURE__ */ jsxs(Primitive.div, {
		...props,
		ref,
		children: [".", ext]
	});
});
AttachmentPrimitiveThumb.displayName = "AttachmentPrimitive.unstable_Thumb";
//#endregion
export { AttachmentPrimitiveThumb };

//# sourceMappingURL=AttachmentThumb.js.map