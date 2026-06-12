"use client";
import { Primitive } from "../../utils/Primitive.js";
import { useActionBarStopSpeaking } from "@assistant-ui/core/react";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { composeEventHandlers } from "@radix-ui/primitive";
import { useEscapeKeydown } from "@radix-ui/react-use-escape-keydown";
//#region src/primitives/actionBar/ActionBarStopSpeaking.tsx
const useActionBarStopSpeaking$1 = () => {
	const { disabled, stopSpeaking } = useActionBarStopSpeaking();
	if (disabled) return null;
	return stopSpeaking;
};
const ActionBarPrimitiveStopSpeaking = forwardRef((props, ref) => {
	const callback = useActionBarStopSpeaking$1();
	useEscapeKeydown((e) => {
		if (callback) {
			e.preventDefault();
			callback();
		}
	});
	return /* @__PURE__ */ jsx(Primitive.button, {
		type: "button",
		disabled: !callback,
		...props,
		ref,
		onClick: composeEventHandlers(props.onClick, () => {
			callback?.();
		})
	});
});
ActionBarPrimitiveStopSpeaking.displayName = "ActionBarPrimitive.StopSpeaking";
//#endregion
export { ActionBarPrimitiveStopSpeaking };

//# sourceMappingURL=ActionBarStopSpeaking.js.map