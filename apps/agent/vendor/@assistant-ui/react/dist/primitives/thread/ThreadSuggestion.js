"use client";
import { createActionButton } from "../../utils/createActionButton.js";
import { useSuggestionTrigger } from "@assistant-ui/core/react";
//#region src/primitives/thread/ThreadSuggestion.ts
const useThreadSuggestion = ({ prompt, send, clearComposer, autoSend, method: _method }) => {
	const { disabled, trigger } = useSuggestionTrigger({
		prompt,
		send: send ?? autoSend ?? false,
		clearComposer
	});
	if (disabled) return null;
	return trigger;
};
const ThreadPrimitiveSuggestion = createActionButton("ThreadPrimitive.Suggestion", useThreadSuggestion, [
	"prompt",
	"send",
	"clearComposer",
	"autoSend",
	"method"
]);
//#endregion
export { ThreadPrimitiveSuggestion };

//# sourceMappingURL=ThreadSuggestion.js.map