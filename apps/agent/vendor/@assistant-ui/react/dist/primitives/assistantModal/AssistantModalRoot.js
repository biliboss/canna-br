"use client";
import { usePopoverScope } from "./scope.js";
import { useAui } from "@assistant-ui/store";
import { useEffect, useState } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { Popover } from "radix-ui";
//#region src/primitives/assistantModal/AssistantModalRoot.tsx
const useAssistantModalOpenState = ({ defaultOpen = false, unstable_openOnRunStart = true }) => {
	const state = useState(defaultOpen);
	const [, setOpen] = state;
	const aui = useAui();
	useEffect(() => {
		if (!unstable_openOnRunStart) return void 0;
		return aui.on("thread.runStart", () => {
			setOpen(true);
		});
	}, [
		unstable_openOnRunStart,
		aui,
		setOpen
	]);
	return state;
};
const AssistantModalPrimitiveRoot = ({ __scopeAssistantModal, defaultOpen, unstable_openOnRunStart, open, onOpenChange, ...rest }) => {
	const scope = usePopoverScope(__scopeAssistantModal);
	const [modalOpen, setOpen] = useAssistantModalOpenState({
		defaultOpen,
		unstable_openOnRunStart
	});
	const openChangeHandler = (open) => {
		onOpenChange?.(open);
		setOpen(open);
	};
	return /* @__PURE__ */ jsx(Popover.Root, {
		...scope,
		open: open === void 0 ? modalOpen : open,
		onOpenChange: openChangeHandler,
		...rest
	});
};
AssistantModalPrimitiveRoot.displayName = "AssistantModalPrimitive.Root";
//#endregion
export { AssistantModalPrimitiveRoot };

//# sourceMappingURL=AssistantModalRoot.js.map