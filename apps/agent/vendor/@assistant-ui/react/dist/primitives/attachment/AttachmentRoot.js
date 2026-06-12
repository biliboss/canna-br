"use client";
import { Primitive } from "../../utils/Primitive.js";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
//#region src/primitives/attachment/AttachmentRoot.tsx
/**
* The root container component for an attachment.
*
* This component provides the foundational wrapper for attachment-related components
* and content. It serves as the context provider for attachment state and actions.
*
* @example
* ```tsx
* <AttachmentPrimitive.Root>
*   <AttachmentPrimitive.Name />
*   <AttachmentPrimitive.Remove />
* </AttachmentPrimitive.Root>
* ```
*/
const AttachmentPrimitiveRoot = forwardRef((props, ref) => {
	return /* @__PURE__ */ jsx(Primitive.div, {
		...props,
		ref
	});
});
AttachmentPrimitiveRoot.displayName = "AttachmentPrimitive.Root";
//#endregion
export { AttachmentPrimitiveRoot };

//# sourceMappingURL=AttachmentRoot.js.map