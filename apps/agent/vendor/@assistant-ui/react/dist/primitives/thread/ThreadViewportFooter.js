"use client";
import { useThreadViewport } from "../../context/react/ThreadViewportContext.js";
import { Primitive } from "../../utils/Primitive.js";
import { useSizeHandle } from "../../utils/hooks/useSizeHandle.js";
import { forwardRef, useCallback } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { useComposedRefs } from "@radix-ui/react-compose-refs";
//#region src/primitives/thread/ThreadViewportFooter.tsx
/**
* A footer container that measures its height for scroll calculations.
*
* This component measures its height and provides it to the viewport context
* so the auto-scroll system can account for any sticky footer overlapping the
* message list.
*
* Multiple ViewportFooter components can be used - their heights are summed.
*
* Typically used with `className="sticky bottom-0"` to keep the footer
* visible at the bottom of the viewport while scrolling.
*
* @example
* ```tsx
* <ThreadPrimitive.Viewport>
*   <ThreadPrimitive.Messages>
*     {() => <MyMessage />}
*   </ThreadPrimitive.Messages>
*   <ThreadPrimitive.ViewportFooter className="sticky bottom-0">
*     <Composer />
*   </ThreadPrimitive.ViewportFooter>
* </ThreadPrimitive.Viewport>
* ```
*/
const ThreadPrimitiveViewportFooter = forwardRef((props, forwardedRef) => {
	const ref = useComposedRefs(forwardedRef, useSizeHandle(useThreadViewport((s) => s.registerContentInset), useCallback((el) => {
		const marginTop = parseFloat(getComputedStyle(el).marginTop) || 0;
		return el.offsetHeight + marginTop;
	}, [])));
	return /* @__PURE__ */ jsx(Primitive.div, {
		...props,
		ref
	});
});
ThreadPrimitiveViewportFooter.displayName = "ThreadPrimitive.ViewportFooter";
//#endregion
export { ThreadPrimitiveViewportFooter };

//# sourceMappingURL=ThreadViewportFooter.js.map