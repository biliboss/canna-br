"use client";
import { Primitive } from "../../utils/Primitive.js";
import { useAuiState } from "@assistant-ui/store";
import { forwardRef } from "@assistant-ui/tap/react-shim";
import { jsx } from "react/jsx-runtime";
//#region src/primitives/composer/ComposerDictationTranscript.tsx
/**
* Renders the current interim (partial) transcript while dictation is active.
*
* This component displays real-time feedback of what the user is saying before
* the transcription is finalized and committed to the composer input.
*
* @example
* ```tsx
* <ComposerPrimitive.If dictation>
*   <div className="dictation-preview">
*     <ComposerPrimitive.DictationTranscript />
*   </div>
* </ComposerPrimitive.If>
* ```
*/
const ComposerPrimitiveDictationTranscript = forwardRef(({ children, ...props }, forwardRef) => {
	const transcript = useAuiState((s) => s.composer.dictation?.transcript);
	if (!transcript) return null;
	return /* @__PURE__ */ jsx(Primitive.span, {
		...props,
		ref: forwardRef,
		children: children ?? transcript
	});
});
ComposerPrimitiveDictationTranscript.displayName = "ComposerPrimitive.DictationTranscript";
//#endregion
export { ComposerPrimitiveDictationTranscript };

//# sourceMappingURL=ComposerDictationTranscript.js.map