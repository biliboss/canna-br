"use client";
import { createActionButton } from "../../utils/createActionButton.js";
import { useAui, useAuiState } from "@assistant-ui/store";
import { useCallback } from "@assistant-ui/tap/react-shim";
//#region src/primitives/composer/ComposerStopDictation.ts
const useComposerStopDictation = () => {
	const aui = useAui();
	const isDictating = useAuiState((s) => s.composer.dictation != null);
	const callback = useCallback(() => {
		aui.composer().stopDictation();
	}, [aui]);
	if (!isDictating) return null;
	return callback;
};
/**
* A button that stops the current dictation session.
*
* Only rendered when dictation is active.
*
* @example
* ```tsx
* <ComposerPrimitive.StopDictation>
*   <StopIcon />
* </ComposerPrimitive.StopDictation>
* ```
*/
const ComposerPrimitiveStopDictation = createActionButton("ComposerPrimitive.StopDictation", useComposerStopDictation);
//#endregion
export { ComposerPrimitiveStopDictation };

//# sourceMappingURL=ComposerStopDictation.js.map