import { usePopoverScope } from "./scope.js";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { Popover } from "radix-ui";
//#region src/primitives/assistantModal/AssistantModalTrigger.tsx
const AssistantModalPrimitiveTrigger = forwardRef(({ __scopeAssistantModal, ...rest }, ref) => {
	const scope = usePopoverScope(__scopeAssistantModal);
	return /* @__PURE__ */ jsx(Popover.Trigger, {
		...scope,
		...rest,
		ref
	});
});
AssistantModalPrimitiveTrigger.displayName = "AssistantModalPrimitive.Trigger";
//#endregion
export { AssistantModalPrimitiveTrigger };

//# sourceMappingURL=AssistantModalTrigger.js.map