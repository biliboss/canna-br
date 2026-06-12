"use client";
import { useMessagePartText } from "./useMessagePartText.js";
import { useSmooth } from "../../utils/smooth/useSmooth.js";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
//#region src/primitives/messagePart/MessagePartText.tsx
/**
* Renders the text content of a message part with optional smooth streaming.
*
* This component displays text content from the current message part context,
* with support for smooth streaming animation that shows text appearing
* character by character as it's generated.
*
* @example
* ```tsx
* <MessagePartPrimitive.Text
*   smooth={true}
*   component="p"
*   className="message-text"
* />
* ```
*/
const MessagePartPrimitiveText = forwardRef(({ smooth = true, component: Component = "span", ...rest }, forwardedRef) => {
	const { text, status } = useSmooth(useMessagePartText(), smooth);
	return /* @__PURE__ */ jsx(Component, {
		"data-status": status.type,
		...rest,
		ref: forwardedRef,
		children: text
	});
});
MessagePartPrimitiveText.displayName = "MessagePartPrimitive.Text";
//#endregion
export { MessagePartPrimitiveText };

//# sourceMappingURL=MessagePartText.js.map