"use client";
import { Primitive } from "../../../utils/Primitive.js";
import { useTriggerPopoverScopeContext } from "./TriggerPopover.js";
import { forwardRef, useCallback } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { composeEventHandlers } from "@radix-ui/primitive";
//#region src/primitives/composer/trigger/TriggerPopoverItems.tsx
/**
* Renders the list of items within a category or search results via a render function.
* Only renders when a category is active or search mode is on.
*/
const ComposerPrimitiveTriggerPopoverItems = forwardRef(({ children, "aria-label": ariaLabel, ...props }, forwardedRef) => {
	const { items, activeCategoryId, isSearchMode, open } = useTriggerPopoverScopeContext();
	if (!open || !activeCategoryId && !isSearchMode) return null;
	return /* @__PURE__ */ jsx(Primitive.div, {
		role: "group",
		"aria-label": ariaLabel ?? "Items",
		...props,
		ref: forwardedRef,
		children: children(items)
	});
});
ComposerPrimitiveTriggerPopoverItems.displayName = "ComposerPrimitive.TriggerPopoverItems";
/**
* A button that selects a trigger item.
* Automatically receives `data-highlighted` when keyboard-navigated.
*/
const ComposerPrimitiveTriggerPopoverItem = forwardRef(({ item, index: indexProp, onClick, onMouseMove, ...props }, forwardedRef) => {
	const { selectItem, highlightIndex, items, highlightedIndex, activeCategoryId, isSearchMode, popoverId } = useTriggerPopoverScopeContext();
	const handleClick = useCallback(() => {
		selectItem(item);
	}, [selectItem, item]);
	const itemIndex = indexProp ?? items.findIndex((i) => i.id === item.id);
	const isHighlighted = (isSearchMode || activeCategoryId !== null) && itemIndex === highlightedIndex;
	const handleMouseMove = useCallback(() => {
		highlightIndex(itemIndex);
	}, [highlightIndex, itemIndex]);
	return /* @__PURE__ */ jsx(Primitive.button, {
		type: "button",
		role: "option",
		id: `${popoverId}-option-${item.id}`,
		"aria-selected": isHighlighted,
		"data-highlighted": isHighlighted ? "" : void 0,
		...props,
		ref: forwardedRef,
		onClick: composeEventHandlers(onClick, handleClick),
		onMouseMove: composeEventHandlers(onMouseMove, handleMouseMove)
	});
});
ComposerPrimitiveTriggerPopoverItem.displayName = "ComposerPrimitive.TriggerPopoverItem";
//#endregion
export { ComposerPrimitiveTriggerPopoverItem, ComposerPrimitiveTriggerPopoverItems };

//# sourceMappingURL=TriggerPopoverItems.js.map