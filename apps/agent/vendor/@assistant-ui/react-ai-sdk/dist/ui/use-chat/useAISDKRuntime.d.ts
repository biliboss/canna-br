import { JoinStrategy } from "@assistant-ui/core/react";
import { AppendMessage, AssistantRuntime, ExternalStoreAdapter, ExternalStoreSharedOptions, ThreadHistoryAdapter } from "@assistant-ui/core";
import { CreateUIMessage, UIMessage, useChat } from "@ai-sdk/react";

//#region src/ui/use-chat/useAISDKRuntime.d.ts
type CustomToCreateMessageFunction = <UI_MESSAGE extends UIMessage = UIMessage>(message: AppendMessage) => CreateUIMessage<UI_MESSAGE>;
type AISDKRuntimeAdapter = ExternalStoreSharedOptions & {
  adapters?: (NonNullable<ExternalStoreAdapter["adapters"]> & {
    history?: ThreadHistoryAdapter | undefined;
  }) | undefined;
  toCreateMessage?: CustomToCreateMessageFunction;
  /**
   * Whether to automatically cancel pending interactive tool calls when the user sends a new message.
   *
   * When enabled (default), the pending tool calls will be marked as failed with an error message
   * indicating the user cancelled the tool call by sending a new message.
   *
   * @default true
   */
  cancelPendingToolCallsOnSend?: boolean | undefined;
  /**
   * Called when `runtime.thread.resumeRun(config)` is invoked.
   *
   * When omitted, `resumeRun` throws `"Runtime does not support resuming runs."`.
   * Provide this to bridge resume invocations into a custom replay channel
   * (for example, an SSE reconnect endpoint keyed by turn id).
   */
  onResume?: ExternalStoreAdapter["onResume"];
  /**
   * How consecutive assistant messages are rendered.
   *
   * `"concat-content"` (the default) merges them into a single thread message.
   * `"none"` keeps each assistant message as its own thread message, which is
   * useful when a backend persists proactive or consecutive assistant messages
   * as separate entries.
   */
  joinStrategy?: JoinStrategy | undefined;
};
declare const useAISDKRuntime: <UI_MESSAGE extends UIMessage = UIMessage>(chatHelpers: ReturnType<typeof useChat<UI_MESSAGE>>, adapter?: AISDKRuntimeAdapter) => AssistantRuntime;
//#endregion
export { AISDKRuntimeAdapter, CustomToCreateMessageFunction, useAISDKRuntime };
//# sourceMappingURL=useAISDKRuntime.d.ts.map