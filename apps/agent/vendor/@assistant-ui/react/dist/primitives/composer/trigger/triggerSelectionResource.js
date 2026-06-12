import { useEffectEvent, useRef } from "@assistant-ui/tap/react-shim";
import { resource } from "@assistant-ui/tap";
//#region src/primitives/composer/trigger/triggerSelectionResource.ts
/** Owns composer text mutation + behavior dispatch on item selection. */
const useTriggerSelectionResource = ({ behavior, trigger, aui, triggerChar, setCursorPosition, onSelected }) => {
	const selectItemOverrideRef = useRef(null);
	const registerSelectItemOverride = useEffectEvent((fn) => {
		selectItemOverrideRef.current = fn;
		return () => {
			if (selectItemOverrideRef.current === fn) selectItemOverrideRef.current = null;
		};
	});
	return {
		selectItem: useEffectEvent((item) => {
			if (!trigger || !behavior) return;
			if (selectItemOverrideRef.current?.(item)) {
				onSelected();
				return;
			}
			const currentText = aui.composer().getState().text;
			const before = currentText.slice(0, trigger.offset);
			const after = currentText.slice(trigger.offset + triggerChar.length + trigger.query.length);
			const insertDirective = () => {
				const directive = behavior.formatter.serialize(item);
				aui.composer().setText(before + directive + (after.startsWith(" ") ? after : ` ${after}`));
			};
			if (behavior.kind === "directive") {
				insertDirective();
				behavior.onInserted?.(item);
			} else {
				if (behavior.removeOnExecute) aui.composer().setText(before + (after.startsWith(" ") ? after.slice(1) : after));
				else insertDirective();
				behavior.onExecute(item);
			}
			onSelected();
		}),
		close: useEffectEvent(() => {
			onSelected();
			if (trigger) setCursorPosition(trigger.offset);
		}),
		registerSelectItemOverride
	};
};
const TriggerSelectionResource = resource(useTriggerSelectionResource);
//#endregion
export { TriggerSelectionResource };

//# sourceMappingURL=triggerSelectionResource.js.map