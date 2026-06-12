"use client";
import { Primitive } from "../../utils/Primitive.js";
import { useComposerSend } from "./ComposerSend.js";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { composeEventHandlers } from "@radix-ui/primitive";
//#region src/primitives/composer/ComposerRoot.tsx
/**
* The root form container for message composition.
*
* This component provides a form wrapper that handles message submission when the form
* is submitted (e.g., via Enter key or submit button). It automatically prevents the
* default form submission and triggers the composer's send functionality.
*
* @example
* ```tsx
* <ComposerPrimitive.Root>
*   <ComposerPrimitive.Input placeholder="Type your message..." />
*   <ComposerPrimitive.Send>Send</ComposerPrimitive.Send>
* </ComposerPrimitive.Root>
* ```
*/
const ComposerPrimitiveRoot = forwardRef(({ onSubmit, ...rest }, forwardedRef) => {
	const send = useComposerSend();
	const handleSubmit = (e) => {
		e.preventDefault();
		if (!send) return;
		send();
	};
	return /* @__PURE__ */ jsx(Primitive.form, {
		...rest,
		ref: forwardedRef,
		onSubmit: composeEventHandlers(onSubmit, handleSubmit)
	});
});
ComposerPrimitiveRoot.displayName = "ComposerPrimitive.Root";
//#endregion
export { ComposerPrimitiveRoot };

//# sourceMappingURL=ComposerRoot.js.map