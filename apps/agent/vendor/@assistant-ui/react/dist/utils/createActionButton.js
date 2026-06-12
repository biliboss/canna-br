import { Primitive } from "./Primitive.js";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { composeEventHandlers } from "@radix-ui/primitive";
//#region src/utils/createActionButton.tsx
const createActionButton = (displayName, useActionButton, forwardProps = []) => {
	const ActionButton = forwardRef((props, forwardedRef) => {
		const forwardedProps = {};
		const primitiveProps = {};
		Object.keys(props).forEach((key) => {
			if (forwardProps.includes(key)) forwardedProps[key] = props[key];
			else primitiveProps[key] = props[key];
		});
		const callback = useActionButton(forwardedProps) ?? void 0;
		return /* @__PURE__ */ jsx(Primitive.button, {
			...primitiveProps,
			type: "button",
			ref: forwardedRef,
			disabled: primitiveProps.disabled || !callback,
			onClick: composeEventHandlers(primitiveProps.onClick, callback)
		});
	});
	ActionButton.displayName = displayName;
	return ActionButton;
};
//#endregion
export { createActionButton };

//# sourceMappingURL=createActionButton.js.map