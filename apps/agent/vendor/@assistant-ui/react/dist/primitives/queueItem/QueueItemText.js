"use client";
import { Primitive } from "../../utils/Primitive.js";
import { useAuiState } from "@assistant-ui/store";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
//#region src/primitives/queueItem/QueueItemText.tsx
/**
* Renders the prompt text of a queue item.
*
* @example
* ```tsx
* <QueueItemPrimitive.Text />
* ```
*/
const QueueItemPrimitiveText = forwardRef((props, ref) => {
	const prompt = useAuiState((s) => s.queueItem.prompt);
	return /* @__PURE__ */ jsx(Primitive.span, {
		...props,
		ref,
		children: props.children ?? prompt
	});
});
QueueItemPrimitiveText.displayName = "QueueItemPrimitive.Text";
//#endregion
export { QueueItemPrimitiveText };

//# sourceMappingURL=QueueItemText.js.map