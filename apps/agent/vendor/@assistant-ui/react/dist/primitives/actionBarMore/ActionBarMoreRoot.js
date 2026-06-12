"use client";
import { useActionBarInteractionContext } from "../actionBar/ActionBarInteractionContext.js";
import { useDropdownMenuScope } from "./scope.js";
import { useCallback, useEffect, useRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { DropdownMenu } from "radix-ui";
//#region src/primitives/actionBarMore/ActionBarMoreRoot.tsx
const ActionBarMorePrimitiveRoot = ({ __scopeActionBarMore, open, onOpenChange, ...rest }) => {
	const scope = useDropdownMenuScope(__scopeActionBarMore);
	const actionBarInteraction = useActionBarInteractionContext();
	const releaseInteractionLockRef = useRef(null);
	const isControlled = open !== void 0;
	const setInteractionOpen = useCallback((nextOpen) => {
		if (nextOpen) {
			if (releaseInteractionLockRef.current) return;
			releaseInteractionLockRef.current = actionBarInteraction?.acquireInteractionLock() ?? null;
			return;
		}
		releaseInteractionLockRef.current?.();
		releaseInteractionLockRef.current = null;
	}, [actionBarInteraction]);
	const handleOpenChange = useCallback((nextOpen) => {
		if (!isControlled) setInteractionOpen(nextOpen);
		onOpenChange?.(nextOpen);
	}, [
		isControlled,
		setInteractionOpen,
		onOpenChange
	]);
	useEffect(() => {
		if (!isControlled) return;
		setInteractionOpen(Boolean(open));
	}, [
		isControlled,
		open,
		setInteractionOpen
	]);
	useEffect(() => {
		return () => {
			releaseInteractionLockRef.current?.();
			releaseInteractionLockRef.current = null;
		};
	}, []);
	return /* @__PURE__ */ jsx(DropdownMenu.Root, {
		...scope,
		...rest,
		...open !== void 0 ? { open } : null,
		onOpenChange: handleOpenChange
	});
};
ActionBarMorePrimitiveRoot.displayName = "ActionBarMorePrimitive.Root";
//#endregion
export { ActionBarMorePrimitiveRoot };

//# sourceMappingURL=ActionBarMoreRoot.js.map