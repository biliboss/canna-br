"use client";
import { MessagePartPrimitiveText } from "../messagePart/MessagePartText.js";
import { MessagePartPrimitiveImage } from "../messagePart/MessagePartImage.js";
import { MessagePartPrimitiveInProgress } from "../messagePart/MessagePartInProgress.js";
import { MessagePartComponent as MessagePartComponentBase, MessagePrimitivePartByIndex as MessagePrimitivePartByIndexBase, MessagePrimitiveParts as MessagePrimitiveParts$1, messagePartsDefaultComponents } from "@assistant-ui/core/react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/primitives/message/MessageParts.tsx
const webDefaultComponents = {
	...messagePartsDefaultComponents,
	Text: () => /* @__PURE__ */ jsxs("p", {
		style: { whiteSpace: "pre-line" },
		children: [/* @__PURE__ */ jsx(MessagePartPrimitiveText, {}), /* @__PURE__ */ jsx(MessagePartPrimitiveInProgress, { children: /* @__PURE__ */ jsx("span", {
			style: { fontFamily: "revert" },
			children: " ●"
		}) })]
	}),
	Image: () => /* @__PURE__ */ jsx(MessagePartPrimitiveImage, {})
};
/**
* Renders the parts of a message with web-specific default components.
*/
const MessagePrimitiveParts = (props) => {
	if ("children" in props) return /* @__PURE__ */ jsx(MessagePrimitiveParts$1, { children: props.children });
	const { components, ...rest } = props;
	return /* @__PURE__ */ jsx(MessagePrimitiveParts$1, {
		components: components ? {
			Text: components.Text ?? webDefaultComponents.Text,
			Image: components.Image ?? webDefaultComponents.Image,
			Reasoning: components.Reasoning ?? messagePartsDefaultComponents.Reasoning,
			Source: components.Source ?? messagePartsDefaultComponents.Source,
			File: components.File ?? messagePartsDefaultComponents.File,
			Unstable_Audio: components.Unstable_Audio ?? messagePartsDefaultComponents.Unstable_Audio,
			..."ChainOfThought" in components ? { ChainOfThought: components.ChainOfThought } : {
				tools: components.tools,
				data: components.data,
				ToolGroup: components.ToolGroup ?? messagePartsDefaultComponents.ToolGroup,
				ReasoningGroup: components.ReasoningGroup ?? messagePartsDefaultComponents.ReasoningGroup
			},
			Empty: components.Empty,
			Quote: components.Quote,
			generativeUI: components.generativeUI
		} : webDefaultComponents,
		...rest
	});
};
MessagePrimitiveParts.displayName = "MessagePrimitive.Parts";
//#endregion
export { MessagePartComponentBase as MessagePartComponent, MessagePrimitivePartByIndexBase as MessagePrimitivePartByIndex, MessagePrimitiveParts };

//# sourceMappingURL=MessageParts.js.map