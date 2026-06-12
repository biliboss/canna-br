"use client";
import { Primitive } from "../../utils/Primitive.js";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
//#region src/primitives/threadList/ThreadListRoot.tsx
const ThreadListPrimitiveRoot = forwardRef((props, ref) => {
	return /* @__PURE__ */ jsx(Primitive.div, {
		...props,
		ref
	});
});
ThreadListPrimitiveRoot.displayName = "ThreadListPrimitive.Root";
//#endregion
export { ThreadListPrimitiveRoot };

//# sourceMappingURL=ThreadListRoot.js.map