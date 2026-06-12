import { MessageTiming } from "@assistant-ui/core";
import { UIMessage } from "@ai-sdk/react";

//#region src/ui/use-chat/useStreamingTiming.d.ts
/**
 * Tracks streaming timing for AI SDK messages client-side.
 *
 * Observes `isRunning` transitions and content changes to estimate
 * timing metrics (TTFT, duration, tok/s). Timing is finalized when
 * streaming ends and stored per message ID.
 */
declare const useStreamingTiming: (messages: UIMessage[], isRunning: boolean) => Record<string, MessageTiming>;
//#endregion
export { useStreamingTiming };
//# sourceMappingURL=useStreamingTiming.d.ts.map