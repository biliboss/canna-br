"use client";
import { Primitive } from "../../../utils/Primitive.js";
import { useTriggerPopoverScopeContext } from "./TriggerPopover.js";
import { forwardRef, useCallback } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
import { composeEventHandlers } from "@radix-ui/primitive";
//#region src/primitives/composer/trigger/TriggerPopoverCategories.tsx
/**
* Renders the top-level category list via a render function.
* Only renders when no category is active and search mode is off.
*/
const ComposerPrimitiveTriggerPopoverCategories = forwardRef(({ children, "aria-label": ariaLabel, ...props }, forwardedRef) => {
	const { categories, activeCategoryId, isSearchMode, open } = useTriggerPopoverScopeContext();
	if (!open || activeCategoryId || isSearchMode) return null;
	return /* @__PURE__ */ jsx(Primitive.div, {
		role: "group",
		"aria-label": ariaLabel ?? "Categories",
		...props,
		ref: forwardedRef,
		children: children(categories)
	});
});
ComposerPrimitiveTriggerPopoverCategories.displayName = "ComposerPrimitive.TriggerPopoverCategories";
/**
* A button that selects a category and triggers drill-down navigation.
* Automatically receives `data-highlighted` when keyboard-navigated.
*/
const ComposerPrimitiveTriggerPopoverCategoryItem = forwardRef(({ categoryId, onClick, onMouseMove, ...props }, forwardedRef) => {
	const { selectCategory, highlightIndex, categories, highlightedIndex, activeCategoryId, isSearchMode, popoverId } = useTriggerPopoverScopeContext();
	const handleClick = useCallback(() => {
		selectCategory(categoryId);
	}, [selectCategory, categoryId]);
	const categoryIndex = categories.findIndex((c) => c.id === categoryId);
	const isHighlighted = !activeCategoryId && !isSearchMode && categoryIndex === highlightedIndex;
	const handleMouseMove = useCallback(() => {
		highlightIndex(categoryIndex);
	}, [highlightIndex, categoryIndex]);
	return /* @__PURE__ */ jsx(Primitive.button, {
		type: "button",
		role: "option",
		id: `${popoverId}-option-${categoryId}`,
		"aria-selected": isHighlighted,
		"data-highlighted": isHighlighted ? "" : void 0,
		...props,
		ref: forwardedRef,
		onClick: composeEventHandlers(onClick, handleClick),
		onMouseMove: composeEventHandlers(onMouseMove, handleMouseMove)
	});
});
ComposerPrimitiveTriggerPopoverCategoryItem.displayName = "ComposerPrimitive.TriggerPopoverCategoryItem";
//#endregion
export { ComposerPrimitiveTriggerPopoverCategories, ComposerPrimitiveTriggerPopoverCategoryItem };

//# sourceMappingURL=TriggerPopoverCategories.js.map