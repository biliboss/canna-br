"use client";
import { useEffect, useRef, useState } from "react";
import { isToolUIPart } from "ai";
//#region src/ui/use-chat/useStreamingTiming.ts
function getTextLength(message) {
	if (!message?.parts) return 0;
	let len = 0;
	for (const part of message.parts) if (part.type === "text") len += part.text.length;
	return len;
}
function getToolCallCount(message) {
	if (!message?.parts) return 0;
	let count = 0;
	for (const part of message.parts) if (isToolUIPart(part)) count++;
	return count;
}
/**
* Tracks streaming timing for AI SDK messages client-side.
*
* Observes `isRunning` transitions and content changes to estimate
* timing metrics (TTFT, duration, tok/s). Timing is finalized when
* streaming ends and stored per message ID.
*/
const useStreamingTiming = (messages, isRunning) => {
	const [timings, setTimings] = useState({});
	const trackRef = useRef(null);
	useEffect(() => {
		const lastAssistant = messages.findLast((m) => m.role === "assistant");
		if (isRunning && lastAssistant) {
			if (!trackRef.current || trackRef.current.messageId !== lastAssistant.id) trackRef.current = {
				messageId: lastAssistant.id,
				startTime: Date.now(),
				lastContentLength: 0,
				totalChunks: 0
			};
			const t = trackRef.current;
			const len = getTextLength(lastAssistant);
			if (len > t.lastContentLength) {
				if (t.firstTokenTime === void 0) t.firstTokenTime = Date.now() - t.startTime;
				t.totalChunks++;
				t.lastContentLength = len;
			}
		} else if (!isRunning && trackRef.current) {
			const t = trackRef.current;
			const totalStreamTime = Date.now() - t.startTime;
			const tokenCount = Math.ceil(t.lastContentLength / 4);
			const toolCallCount = getToolCallCount(lastAssistant);
			const timing = {
				streamStartTime: t.startTime,
				totalStreamTime,
				totalChunks: t.totalChunks,
				toolCallCount,
				...t.firstTokenTime !== void 0 && { firstTokenTime: t.firstTokenTime },
				...tokenCount > 0 && { tokenCount },
				...totalStreamTime > 0 && tokenCount > 0 && { tokensPerSecond: tokenCount / (totalStreamTime / 1e3) }
			};
			setTimings((prev) => ({
				...prev,
				[t.messageId]: timing
			}));
			trackRef.current = null;
		}
	}, [messages, isRunning]);
	return timings;
};
//#endregion
export { useStreamingTiming };

//# sourceMappingURL=useStreamingTiming.js.map