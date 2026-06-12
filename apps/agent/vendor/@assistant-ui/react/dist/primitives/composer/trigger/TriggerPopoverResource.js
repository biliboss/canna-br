import { TriggerDetectionResource } from "./triggerDetectionResource.js";
import { TriggerKeyboardResource } from "./triggerKeyboardResource.js";
import { TriggerNavigationResource } from "./triggerNavigationResource.js";
import { TriggerSelectionResource } from "./triggerSelectionResource.js";
import { useEffectEvent } from "@assistant-ui/tap/react-shim";
import { resource, useResource } from "@assistant-ui/tap";
//#region src/primitives/composer/trigger/TriggerPopoverResource.ts
/** Composes detection, navigation, keyboard, and selection sub-resources. */
const useTriggerPopoverResource = ({ adapter, text, triggerChar, behavior, aui, popoverId }) => {
	const detection = useResource(TriggerDetectionResource({
		text,
		triggerChar
	}));
	const open = detection.trigger !== null && adapter !== void 0 && behavior !== void 0;
	const navigation = useResource(TriggerNavigationResource({
		adapter,
		query: detection.query,
		open
	}));
	const onSelected = useEffectEvent(() => {
		navigation.goBack();
	});
	const selection = useResource(TriggerSelectionResource({
		behavior,
		trigger: detection.trigger,
		aui,
		triggerChar,
		setCursorPosition: detection.setCursorPosition,
		onSelected
	}));
	const keyboard = useResource(TriggerKeyboardResource({
		navigableList: navigation.navigableList,
		isSearchMode: navigation.isSearchMode,
		activeCategoryId: navigation.activeCategoryId,
		query: detection.query,
		popoverId,
		open,
		selectItem: selection.selectItem,
		selectCategory: navigation.selectCategory,
		goBack: navigation.goBack,
		close: selection.close
	}));
	return {
		open,
		query: detection.query,
		activeCategoryId: navigation.activeCategoryId,
		categories: navigation.categories,
		items: navigation.items,
		highlightedIndex: keyboard.highlightedIndex,
		isSearchMode: navigation.isSearchMode,
		popoverId,
		highlightedItemId: keyboard.highlightedItemId,
		selectCategory: navigation.selectCategory,
		goBack: navigation.goBack,
		selectItem: selection.selectItem,
		close: selection.close,
		highlightIndex: keyboard.highlightIndex,
		handleKeyDown: keyboard.handleKeyDown,
		setCursorPosition: detection.setCursorPosition,
		registerSelectItemOverride: selection.registerSelectItemOverride
	};
};
const TriggerPopoverResource = resource(useTriggerPopoverResource);
//#endregion
export { TriggerPopoverResource };

//# sourceMappingURL=TriggerPopoverResource.js.map