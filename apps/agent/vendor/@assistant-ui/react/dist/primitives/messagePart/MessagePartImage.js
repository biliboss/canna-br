"use client";
import { Primitive } from "../../utils/Primitive.js";
import { useMessagePartImage } from "./useMessagePartImage.js";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
//#region src/primitives/messagePart/MessagePartImage.tsx
/**
* Renders an image from the current message part context.
*
* This component displays image content from the current message part,
* automatically setting the src attribute from the message part's image data.
*
* @example
* ```tsx
* <MessagePartPrimitive.Image
*   alt="Generated image"
*   className="message-image"
*   style={{ maxWidth: '100%' }}
* />
* ```
*/
const MessagePartPrimitiveImage = forwardRef((props, forwardedRef) => {
	const { image } = useMessagePartImage();
	return /* @__PURE__ */ jsx(Primitive.img, {
		src: image,
		...props,
		ref: forwardedRef
	});
});
MessagePartPrimitiveImage.displayName = "MessagePartPrimitive.Image";
//#endregion
export { MessagePartPrimitiveImage };

//# sourceMappingURL=MessagePartImage.js.map