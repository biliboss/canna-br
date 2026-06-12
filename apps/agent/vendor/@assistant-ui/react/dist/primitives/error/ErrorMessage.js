"use client";
import { Primitive } from "../../utils/Primitive.js";
import { useMessageError } from "@assistant-ui/core/react";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
//#region src/primitives/error/ErrorMessage.tsx
const ErrorPrimitiveMessage = forwardRef(({ children, ...props }, forwardRef) => {
	const error = useMessageError();
	if (error === void 0) return null;
	return /* @__PURE__ */ jsx(Primitive.span, {
		...props,
		ref: forwardRef,
		children: children ?? String(error)
	});
});
ErrorPrimitiveMessage.displayName = "ErrorPrimitive.Message";
//#endregion
export { ErrorPrimitiveMessage };

//# sourceMappingURL=ErrorMessage.js.map