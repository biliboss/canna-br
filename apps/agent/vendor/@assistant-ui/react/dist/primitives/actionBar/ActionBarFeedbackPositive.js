"use client";
import { Primitive } from "../../utils/Primitive.js";
import { useAuiState } from "@assistant-ui/store";
import { useActionBarFeedbackPositive } from "@assistant-ui/core/react";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { composeEventHandlers } from "@radix-ui/primitive";
//#region src/primitives/actionBar/ActionBarFeedbackPositive.tsx
const useActionBarFeedbackPositive$1 = () => {
	const { submit } = useActionBarFeedbackPositive();
	return submit;
};
const ActionBarPrimitiveFeedbackPositive = forwardRef(({ onClick, disabled, ...props }, forwardedRef) => {
	const isSubmitted = useAuiState((s) => s.message.metadata.submittedFeedback?.type === "positive");
	const callback = useActionBarFeedbackPositive$1();
	return /* @__PURE__ */ jsx(Primitive.button, {
		type: "button",
		...isSubmitted ? { "data-submitted": "true" } : {},
		...props,
		ref: forwardedRef,
		disabled: disabled || !callback,
		onClick: composeEventHandlers(onClick, () => {
			callback?.();
		})
	});
});
ActionBarPrimitiveFeedbackPositive.displayName = "ActionBarPrimitive.FeedbackPositive";
//#endregion
export { ActionBarPrimitiveFeedbackPositive };

//# sourceMappingURL=ActionBarFeedbackPositive.js.map