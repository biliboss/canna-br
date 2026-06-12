"use client";
import { Primitive } from "../../utils/Primitive.js";
import { useActionBarFloatStatus } from "./useActionBarFloatStatus.js";
import { ActionBarInteractionContext } from "./ActionBarInteractionContext.js";
import { forwardRef, useCallback, useMemo, useState } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
//#region src/primitives/actionBar/ActionBarRoot.tsx
/**
* The root container for action bar components.
*
* This component provides intelligent visibility and floating behavior for action bars,
* automatically hiding and showing based on message state, hover status, and configuration.
* It supports floating mode for better UX when space is limited.
*
* @example
* ```tsx
* <ActionBarPrimitive.Root
*   hideWhenRunning={true}
*   autohide="not-last"
*   autohideFloat="single-branch"
* >
*   <ActionBarPrimitive.Copy />
*   <ActionBarPrimitive.Edit />
*   <ActionBarPrimitive.Reload />
* </ActionBarPrimitive.Root>
* ```
*/
const ActionBarPrimitiveRoot = forwardRef(({ hideWhenRunning, autohide, autohideFloat, ...rest }, ref) => {
	const [interactionCount, setInteractionCount] = useState(0);
	const acquireInteractionLock = useCallback(() => {
		let released = false;
		setInteractionCount((count) => count + 1);
		return () => {
			if (released) return;
			released = true;
			setInteractionCount((count) => Math.max(0, count - 1));
		};
	}, []);
	const interactionContext = useMemo(() => ({ acquireInteractionLock }), [acquireInteractionLock]);
	const hideAndfloatStatus = useActionBarFloatStatus({
		hideWhenRunning,
		autohide,
		autohideFloat,
		forceVisible: interactionCount > 0
	});
	if (hideAndfloatStatus === "hidden") return null;
	return /* @__PURE__ */ jsx(ActionBarInteractionContext.Provider, {
		value: interactionContext,
		children: /* @__PURE__ */ jsx(Primitive.div, {
			...hideAndfloatStatus === "floating" ? { "data-floating": "true" } : null,
			...rest,
			ref
		})
	});
});
ActionBarPrimitiveRoot.displayName = "ActionBarPrimitive.Root";
//#endregion
export { ActionBarPrimitiveRoot };

//# sourceMappingURL=ActionBarRoot.js.map