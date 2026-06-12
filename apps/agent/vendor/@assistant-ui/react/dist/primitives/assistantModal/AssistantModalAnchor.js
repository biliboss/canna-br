"use client";
import { usePopoverScope } from "./scope.js";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { Popover } from "radix-ui";
//#region src/primitives/assistantModal/AssistantModalAnchor.tsx
const AssistantModalPrimitiveAnchor = forwardRef(({ __scopeAssistantModal, ...rest }, ref) => {
	const scope = usePopoverScope(__scopeAssistantModal);
	return /* @__PURE__ */ jsx(Popover.Anchor, {
		...scope,
		...rest,
		ref
	});
});
AssistantModalPrimitiveAnchor.displayName = "AssistantModalPrimitive.Anchor";
//#endregion
export { AssistantModalPrimitiveAnchor };

//# sourceMappingURL=AssistantModalAnchor.js.map