"use client";
import { usePopoverScope } from "./scope.js";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { composeEventHandlers } from "@radix-ui/primitive";
import { Popover } from "radix-ui";
//#region src/primitives/assistantModal/AssistantModalContent.tsx
const AssistantModalPrimitiveContent = forwardRef(({ __scopeAssistantModal, side, align, onInteractOutside, dissmissOnInteractOutside = false, portalProps, ...props }, forwardedRef) => {
	const scope = usePopoverScope(__scopeAssistantModal);
	return /* @__PURE__ */ jsx(Popover.Portal, {
		...scope,
		...portalProps,
		children: /* @__PURE__ */ jsx(Popover.Content, {
			...scope,
			...props,
			ref: forwardedRef,
			side: side ?? "top",
			align: align ?? "end",
			onInteractOutside: composeEventHandlers(onInteractOutside, dissmissOnInteractOutside ? void 0 : (e) => e.preventDefault())
		})
	});
});
AssistantModalPrimitiveContent.displayName = "AssistantModalPrimitive.Content";
//#endregion
export { AssistantModalPrimitiveContent };

//# sourceMappingURL=AssistantModalContent.js.map