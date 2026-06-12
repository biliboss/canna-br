"use client";
import { Primitive } from "../../utils/Primitive.js";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
//#region src/primitives/thread/ThreadRoot.tsx
/**
* The root container component for a thread.
*
* This component serves as the foundational wrapper for all thread-related components.
* It provides the basic structure and context needed for thread functionality.
*
* @example
* ```tsx
* <ThreadPrimitive.Root>
*   <ThreadPrimitive.Viewport>
*     <ThreadPrimitive.Messages>
*       {() => <MyMessage />}
*     </ThreadPrimitive.Messages>
*   </ThreadPrimitive.Viewport>
* </ThreadPrimitive.Root>
* ```
*/
const ThreadPrimitiveRoot = forwardRef((props, ref) => {
	return /* @__PURE__ */ jsx(Primitive.div, {
		...props,
		ref
	});
});
ThreadPrimitiveRoot.displayName = "ThreadPrimitive.Root";
//#endregion
export { ThreadPrimitiveRoot };

//# sourceMappingURL=ThreadRoot.js.map