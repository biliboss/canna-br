"use client";
import { Primitive } from "../../utils/Primitive.js";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
//#region src/primitives/error/ErrorRoot.tsx
const ErrorPrimitiveRoot = forwardRef((props, forwardRef) => {
	return /* @__PURE__ */ jsx(Primitive.div, {
		role: "alert",
		...props,
		ref: forwardRef
	});
});
ErrorPrimitiveRoot.displayName = "ErrorPrimitive.Root";
//#endregion
export { ErrorPrimitiveRoot };

//# sourceMappingURL=ErrorRoot.js.map