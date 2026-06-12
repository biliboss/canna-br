import { detectTrigger } from "./detectTrigger.js";
import { useMemo, useState } from "@assistant-ui/tap/react-shim";
import { resource } from "@assistant-ui/tap";
//#region src/primitives/composer/trigger/triggerDetectionResource.ts
/** Tracks cursor position and derives the active trigger + query from composer text. */
const useTriggerDetectionResource = ({ text, triggerChar }) => {
	const [cursorPosition, setCursorPosition] = useState(text.length);
	const trigger = useMemo(() => {
		return detectTrigger(text, triggerChar, Math.min(cursorPosition, text.length));
	}, [
		cursorPosition,
		text,
		triggerChar
	]);
	return {
		trigger,
		query: trigger?.query ?? "",
		setCursorPosition
	};
};
const TriggerDetectionResource = resource(useTriggerDetectionResource);
//#endregion
export { TriggerDetectionResource };

//# sourceMappingURL=triggerDetectionResource.js.map