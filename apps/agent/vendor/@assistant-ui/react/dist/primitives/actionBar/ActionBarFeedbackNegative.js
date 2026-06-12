"use client";
import { Primitive } from "../../utils/Primitive.js";
import { useAuiState } from "@assistant-ui/store";
import { useActionBarFeedbackNegative } from "@assistant-ui/core/react";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { composeEventHandlers } from "@radix-ui/primitive";
//#region src/primitives/actionBar/ActionBarFeedbackNegative.tsx
const useActionBarFeedbackNegative$1 = () => {
	const { submit } = useActionBarFeedbackNegative();
	return submit;
};
const ActionBarPrimitiveFeedbackNegative = forwardRef(({ onClick, disabled, ...props }, forwardedRef) => {
	const isSubmitted = useAuiState((s) => s.message.metadata.submittedFeedback?.type === "negative");
	const callback = useActionBarFeedbackNegative$1();
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
ActionBarPrimitiveFeedbackNegative.displayName = "ActionBarPrimitive.FeedbackNegative";
//#endregion
export { ActionBarPrimitiveFeedbackNegative };

//# sourceMappingURL=ActionBarFeedbackNegative.js.map