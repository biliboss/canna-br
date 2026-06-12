import { useEffect, useEffectEvent, useState } from "@assistant-ui/tap/react-shim";
import { resource } from "@assistant-ui/tap";
//#region src/primitives/composer/trigger/triggerKeyboardResource.ts
/** Relies on `Unstable_TriggerCategory` never carrying a `type` field. */
function isTriggerItem(x) {
	return "type" in x;
}
/**
* Owns keyboard-driven highlight state for the popover. Delegates selection,
* category drill-in, back, and close to the callbacks supplied by the parent.
*/
const useTriggerKeyboardResource = ({ navigableList, isSearchMode, activeCategoryId, query, popoverId, open, selectItem, selectCategory, goBack, close }) => {
	const [highlightedIndex, setHighlightedIndex] = useState(0);
	useEffect(() => {
		setHighlightedIndex(0);
	}, [navigableList]);
	useEffect(() => {
		setHighlightedIndex(0);
	}, [isSearchMode, activeCategoryId]);
	const highlightIndex = useEffectEvent((index) => {
		if (index < 0 || index >= navigableList.length) return;
		if (index === highlightedIndex) return;
		setHighlightedIndex(index);
	});
	const handleKeyDown = useEffectEvent((e) => {
		if (!open) return false;
		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				setHighlightedIndex((prev) => {
					const len = navigableList.length;
					if (len === 0) return 0;
					return prev < len - 1 ? prev + 1 : 0;
				});
				return true;
			case "ArrowUp":
				e.preventDefault();
				setHighlightedIndex((prev) => {
					const len = navigableList.length;
					if (len === 0) return 0;
					return prev > 0 ? prev - 1 : len - 1;
				});
				return true;
			case "Enter":
			case "Tab": {
				if (e.shiftKey) return false;
				e.preventDefault();
				const item = navigableList[highlightedIndex];
				if (!item) return true;
				if (isTriggerItem(item)) selectItem(item);
				else selectCategory(item.id);
				return true;
			}
			case "Escape":
				e.preventDefault();
				close();
				return true;
			case "Backspace":
				if (activeCategoryId && query === "") {
					e.preventDefault();
					goBack();
					return true;
				}
				return false;
			default: return false;
		}
	});
	const highlightedEntry = navigableList[highlightedIndex];
	return {
		highlightedIndex,
		highlightedItemId: open && highlightedEntry ? `${popoverId}-option-${highlightedEntry.id}` : void 0,
		highlightIndex,
		handleKeyDown
	};
};
const TriggerKeyboardResource = resource(useTriggerKeyboardResource);
//#endregion
export { TriggerKeyboardResource };

//# sourceMappingURL=triggerKeyboardResource.js.map